import { dirname, extname, isAbsolute, resolve } from 'node:path';
import type { DiagnosticErrorDetails } from '../diagnostics';
import { DiagnosticError } from '../diagnostics';
import { type EmittedProgramCss, emitProgramCss } from './css/emit';
import type { DesignSystem } from './design-system';

const DEFAULT_CHUNK = '';
const STYLE_CLASS_REGISTRY_STATE = Symbol.for('@videojs/compiler/style-class-registry');
declare const styleClassRegistryBrand: unique symbol;
const states = new WeakMap<StyleProgram, MutableStyleProgram>();

export interface StyleProgramCssOptions {
  /** Base CSS files to prepend to emitted output. */
  base?: readonly string[] | undefined;
  /** Directory used to resolve relative base CSS paths. */
  configDir?: string | undefined;
  /** CSS emission layout. Defaults to merged output. */
  mode?: 'merged' | 'split';
  /** Selector for referenced Tailwind theme variables. Defaults to `:root`. */
  themeSelector?: string | undefined;
  /** Place global Tailwind support and theme CSS in a sibling support file. */
  support?: 'inline' | 'separate' | undefined;
}

export interface CreateStyleProgramOptions extends StyleProgramCssOptions {
  /** Loaded Tailwind v4 design system. */
  design: DesignSystem;
  /** Entry CSS filename emitted by the program. */
  output: string;
  /** Optional class-contract registry shared by independently emitted programs. */
  registry?: StyleClassRegistry | undefined;
}

/** Validates semantic class contracts across independently emitted programs. */
export interface StyleClassRegistry {
  readonly [styleClassRegistryBrand]: true;
}

export interface StyleOutputFile {
  kind: 'styles' | 'support' | 'index' | 'chunk';
  fileName: string;
  source: string;
}

export interface StyleEmitResult {
  files: readonly StyleOutputFile[];
}

/** A complete semantic stylesheet compilation unit. */
export interface StyleProgram {
  /** Finish collection and emit this program's CSS files. */
  emit(): Promise<StyleEmitResult>;
}

export interface StyleRecipe {
  className: string;
  candidates: readonly string[];
}

export interface StyleChunk {
  name?: string | undefined;
  recipes: readonly StyleRecipe[];
  groupPeerBindings: ReadonlyMap<string, string>;
}

export interface StyleProgramSnapshot {
  chunks: readonly StyleChunk[];
  candidates: readonly string[];
}

export interface StyleRecipeOrigin extends DiagnosticErrorDetails {
  description: string;
}

export interface AddStyleRecipeOptions extends StyleRecipe {
  chunk?: string | undefined;
  merge?: boolean | undefined;
  origin: StyleRecipeOrigin;
}

interface MutableStyleRecipe {
  className: string;
  candidates: string[];
  candidateSet: Set<string>;
}

interface MutableStyleChunk {
  name?: string | undefined;
  recipes: Map<string, MutableStyleRecipe>;
  groupPeerBindings: Map<string, string>;
}

interface StyleSignature {
  candidates: string;
  chunk: string;
  origin: StyleRecipeOrigin;
}

interface RegisteredStyleClass extends StyleSignature {
  program: StyleProgram;
}

interface MutableStyleProgram {
  phase: 'collecting' | 'emitting' | 'emitted';
  design: DesignSystem;
  output: string;
  css: StyleProgramCssOptions;
  chunks: Map<string, MutableStyleChunk>;
  candidates: string[];
  candidateSet: Set<string>;
  signatures: Map<string, StyleSignature>;
  registry?: StyleClassRegistry | undefined;
}

class StyleProgramImpl implements StyleProgram {
  async emit(): Promise<StyleEmitResult> {
    const state = stateFor(this);
    if (state.phase !== 'collecting') {
      throw new Error(`StyleProgram.emit() can only be called once; this program is already ${state.phase}.`);
    }

    state.phase = 'emitting';
    try {
      const snapshot = snapshotStyleProgram(this);
      if (snapshot.candidates.length === 0) {
        state.phase = 'emitted';
        return { files: [] };
      }
      const emitted = await emitProgramCss({
        design: state.design,
        program: snapshot,
        ...state.css,
      });
      state.phase = 'emitted';
      return { files: emittedStyleFiles(state.output, emitted) };
    } catch (error) {
      state.phase = 'collecting';
      throw error;
    }
  }
}

export function createStyleProgram(options: CreateStyleProgramOptions): StyleProgram {
  const program = new StyleProgramImpl();
  states.set(program, {
    phase: 'collecting',
    design: options.design,
    output: options.output,
    css: {
      ...(options.base ? { base: options.base } : {}),
      ...(options.configDir ? { configDir: options.configDir } : {}),
      ...(options.mode ? { mode: options.mode } : {}),
      ...(options.themeSelector ? { themeSelector: options.themeSelector } : {}),
      ...(options.support ? { support: options.support } : {}),
    },
    chunks: new Map(),
    candidates: [],
    candidateSet: new Set(),
    signatures: new Map(),
    ...(options.registry ? { registry: options.registry } : {}),
  });
  return program;
}

export function createStyleClassRegistry(): StyleClassRegistry {
  const registry = {} as StyleClassRegistry;
  Object.defineProperty(registry, STYLE_CLASS_REGISTRY_STATE, { value: new Map<string, RegisteredStyleClass>() });
  return registry;
}

export function designForStyleProgram(program: StyleProgram): DesignSystem {
  return stateFor(program).design;
}

export function addStyleRecipe(program: StyleProgram, recipe: AddStyleRecipeOptions): void {
  const state = collectingStateFor(program);
  const chunkName = recipe.chunk ?? DEFAULT_CHUNK;
  const chunk = getOrCreateChunk(state, chunkName);
  const signature = normalizedCandidates(recipe.candidates);
  const previous = state.signatures.get(recipe.className);

  if (previous && previous.candidates !== signature) {
    if (!recipe.merge) throw classCollisionError(recipe, previous);
    if (previous.chunk !== chunkName) throw crossChunkMergeError(recipe, previous);
  }

  let current = chunk.recipes.get(recipe.className);
  if (!current) {
    current = { className: recipe.className, candidates: [], candidateSet: new Set() };
    chunk.recipes.set(recipe.className, current);
  }

  for (const candidate of recipe.candidates) {
    if (!current.candidateSet.has(candidate)) {
      current.candidateSet.add(candidate);
      current.candidates.push(candidate);
    }
    if (!state.candidateSet.has(candidate)) {
      state.candidateSet.add(candidate);
      state.candidates.push(candidate);
    }
  }

  state.signatures.set(recipe.className, {
    candidates: normalizedCandidates(current.candidates),
    chunk: chunkName,
    origin: previous?.origin ?? recipe.origin,
  });
  if (state.registry)
    registerStyleClass(state.registry, program, recipe.className, state.signatures.get(recipe.className)!);
}

export function registerGroupPeerBinding(
  program: StyleProgram,
  options: {
    marker: string;
    className: string;
    chunk?: string | undefined;
    origin: StyleRecipeOrigin;
  }
): void {
  const state = collectingStateFor(program);
  const chunk = getOrCreateChunk(state, options.chunk ?? DEFAULT_CHUNK);
  const previous = chunk.groupPeerBindings.get(options.marker);
  if (!previous) {
    chunk.groupPeerBindings.set(options.marker, options.className);
    return;
  }
  if (previous === options.className) return;

  throw new DiagnosticError(
    `style extraction: relationship marker '${options.marker}' resolves to multiple semantic classes in the same CSS chunk.\n` +
      `  first: ${previous}\n` +
      `  next:  ${options.className}\n` +
      `Use a unique named group/peer marker or assign the elements to different chunks.`,
    { ...options.origin, diagnosticCode: 'style-group-peer-conflict' }
  );
}

export function snapshotStyleProgram(program: StyleProgram): StyleProgramSnapshot {
  const state = stateFor(program);
  return {
    chunks: [...state.chunks.values()].map((chunk) => ({
      ...(chunk.name === undefined ? {} : { name: chunk.name }),
      recipes: [...chunk.recipes.values()].map(({ candidateSet: _, ...recipe }) => recipe),
      groupPeerBindings: new Map(chunk.groupPeerBindings),
    })),
    candidates: [...state.candidates],
  };
}

function stateFor(program: StyleProgram): MutableStyleProgram {
  const state = states.get(program);
  if (!state) throw new TypeError('Expected a StyleProgram created by createStyleProgram().');
  return state;
}

function collectingStateFor(program: StyleProgram): MutableStyleProgram {
  const state = stateFor(program);
  if (state.phase !== 'collecting') {
    throw new Error(
      `Cannot add styles to a StyleProgram after emit() has ${state.phase === 'emitted' ? 'completed' : 'started'}.`
    );
  }
  return state;
}

function getOrCreateChunk(program: MutableStyleProgram, name: string): MutableStyleChunk {
  let chunk = program.chunks.get(name);
  if (!chunk) {
    chunk = {
      ...(name === DEFAULT_CHUNK ? {} : { name }),
      recipes: new Map(),
      groupPeerBindings: new Map(),
    };
    program.chunks.set(name, chunk);
  }
  return chunk;
}

function normalizedCandidates(candidates: readonly string[]): string {
  return [...new Set(candidates)].sort().join(' ');
}

function registerStyleClass(
  registry: StyleClassRegistry,
  program: StyleProgram,
  className: string,
  signature: StyleSignature
): void {
  const classes = (registry as unknown as Record<symbol, Map<string, RegisteredStyleClass>>)[
    STYLE_CLASS_REGISTRY_STATE
  ];
  if (!classes) throw new TypeError('Expected a StyleClassRegistry created by createStyleClassRegistry().');
  const previous = classes.get(className);
  if (!previous || previous.program === program) {
    classes.set(className, { ...signature, program });
    return;
  }
  if (previous.candidates === signature.candidates) return;

  throw new DiagnosticError(
    `style extraction: class name '${className}' has incompatible recipes across emitted stylesheets.\n` +
      `  first (${previous.origin.description}): ${previous.candidates}\n` +
      `  next (${signature.origin.description}): ${signature.candidates}\n` +
      `A public semantic class must have the same recipe in every independently emitted artifact.`,
    { ...signature.origin, diagnosticCode: 'style-class-contract-collision' }
  );
}

function classCollisionError(recipe: AddStyleRecipeOptions, previous: StyleSignature): DiagnosticError {
  return new DiagnosticError(
    `style extraction: class name '${recipe.className}' is assigned incompatible utility recipes.\n` +
      `  first (${previous.origin.description}): ${previous.candidates}\n` +
      `  next (${recipe.origin.description}): ${normalizedCandidates(recipe.candidates)}\n` +
      `Return { className: '${recipe.className}', merge: true } only when these recipes intentionally compose.`,
    { ...recipe.origin, diagnosticCode: 'style-class-collision' }
  );
}

function crossChunkMergeError(recipe: AddStyleRecipeOptions, previous: StyleSignature): DiagnosticError {
  return new DiagnosticError(
    `style extraction: class name '${recipe.className}' cannot merge recipes across CSS chunks.\n` +
      `  first chunk: ${previous.chunk || '(default)'}\n` +
      `  next chunk:  ${recipe.chunk || '(default)'}\n` +
      `Assign the class to one chunk or use distinct semantic class names.`,
    { ...recipe.origin, diagnosticCode: 'style-class-chunk-collision' }
  );
}

function emittedStyleFiles(output: string, emitted: EmittedProgramCss): StyleOutputFile[] {
  if (emitted.kind === 'merged') return [{ kind: 'styles', fileName: output, source: emitted.css }];
  if (emitted.kind === 'separate') {
    const extension = extname(output);
    const supportOutput = `${extension ? output.slice(0, -extension.length) : output}.support.css`;
    return [
      { kind: 'styles', fileName: output, source: emitted.css },
      { kind: 'support', fileName: supportOutput, source: emitted.support },
    ];
  }

  const dir = dirname(output);
  return [
    { kind: 'index', fileName: output, source: emitted.index },
    ...[...emitted.chunks].map(([chunk, source]) => ({
      kind: 'chunk' as const,
      fileName: isAbsolute(output) ? resolve(dir, `${chunk}.css`) : `${dir === '.' ? '' : `${dir}/`}${chunk}.css`,
      source,
    })),
  ];
}
