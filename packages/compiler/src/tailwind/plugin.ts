import { isAbsolute, resolve as resolvePath } from 'node:path';
import ts from 'typescript';
import type { CompilerContext, CompilerPlugin } from '../config';
import { diagnosticLocationFromNode } from '../diagnostics';
import { tagName } from '../jsx';
import {
  buildTokenEnv,
  collectExtractUtilities,
  type DeriveClassNameOptions,
  DiagnosticError,
  deriveClassName,
  type ResolveTokenModule,
  readStyleAttribute,
  rewriteStyleAttribute,
  type StyleAttributeSegmentsInfo,
  type StyleSegment,
  type TokenEnv,
} from '../styles';
import { cssAssets } from './css/assets';
import { type CompiledRule, type HoistOptions, type RegisteredPropertiesOptions, renderCss } from './css/render';
import { type DesignSystem, loadDesignSystem } from './design-system';
import {
  normalizeResolveElementResult,
  type ResolveClassList,
  type ResolveElement,
  type ResolveElementResult,
  type ResolveRule,
} from './selectors';
import { analyzeUtility, type UtilityCss } from './utility-css';

/** Styling mode for Tailwind-backed className handling. */
export type TailwindMode =
  /** Pass-through. JSX `className` values stay as authored. No CSS emitted. */
  | 'preserve'
  /**
   * Flatten every className array and dotted token reference to a single
   * literal utility string on each `className` prop. No CSS emitted; token
   * imports become unused (handled by `dropUnusedImports`).
   */
  | 'inline'
  /**
   * Rewrite each `className` value to a semantic CSS class name and return CSS
   * as compiler assets.
   */
  | 'extract';

export interface TailwindResolveOptions {
  /** Resolve bare token imports in skin sources to token modules on disk. Relative imports use the default resolver. */
  tokenModule?: ResolveTokenModule | undefined;
  /** Resolve the semantic CSS class name and optional output chunk for an extracted element. */
  element?: ResolveElement | undefined;
  /** Rewrite a composed selector before CSS emission. */
  rule?: ResolveRule | undefined;
  /** Rewrite the final static class list written back to JSX. */
  classList?: ResolveClassList | undefined;
}

export interface TailwindEmitOptions {
  /** Base CSS files to prepend to emitted output. */
  base?: readonly string[];
  /** Directory used to resolve relative base CSS paths. */
  configDir?: string;
  /** CSS emission layout. Defaults to merged output. */
  mode?: 'merged' | 'split';
}

export interface TailwindVarsOptions {
  /** Hoist uniform custom property declarations to a root selector, or disable explicitly. */
  hoist?: false | HoistOptions | undefined;
  /** Inline matching custom properties into values that reference them. */
  inline?: true | RegExp | undefined;
  /** Handle registered @property variables such as Tailwind's --tw-* vars. */
  properties?: RegisteredPropertiesOptions | undefined;
}

export interface TailwindOptions {
  /** Styling mode. Defaults to `'preserve'`. */
  mode?: TailwindMode | undefined;
  /** Loaded Tailwind v4 design system. Required for `'extract'` unless `input` is provided. */
  design?: DesignSystem | undefined;
  /** Tailwind CSS entry used to load the design system when `design` is omitted. */
  input?: string | undefined;
  /** CSS asset name for `'extract'`. Defaults to the compiled source basename with `.css`. */
  output?: string | undefined;
  /** Resolution hooks for token modules, generated class names, and CSS chunks. */
  resolve?: TailwindResolveOptions | undefined;
  /** CSS asset emission options for extract mode. */
  emit?: TailwindEmitOptions | undefined;
  /** CSS custom property handling options for extract mode. */
  vars?: TailwindVarsOptions | undefined;
}

interface TailwindState {
  mode: TailwindMode;
  design?: DesignSystem | undefined;
  env: TokenEnv;
  rules: CompiledRule[];
  signatures: Map<string, string>;
  scaffoldClassReplacements: Map<string, string>;
}

interface TailwindClassNameResolution {
  info: StyleAttributeSegmentsInfo;
  utilities: readonly string[];
  passThrough: readonly ts.Expression[];
}

export function tailwind(options: TailwindOptions = {}): CompilerPlugin {
  return {
    name: 'tailwind',
    async setup(compiler) {
      const state = await createTailwindState(options, compiler);

      if (state.mode === 'preserve') return {};

      return {
        transform: createTailwindTransform(options, state),
        async finish() {
          const assets = await renderTailwindAssets(options, state, compiler);
          for (const asset of assets) compiler.addAsset(asset);
        },
      };
    },
  };
}

async function createTailwindState(options: TailwindOptions, compiler: CompilerContext): Promise<TailwindState> {
  const mode = options.mode ?? 'preserve';

  return {
    mode,
    ...(mode === 'extract' ? { design: await resolveDesignSystem(options, compiler) } : {}),
    env: buildTokenEnv(compiler.filename, options.resolve?.tokenModule),
    rules: [],
    signatures: new Map(),
    scaffoldClassReplacements: new Map(),
  };
}

function createTailwindTransform(options: TailwindOptions, state: TailwindState): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    const factory = transformContext.factory;

    return (sourceFile) => {
      const visitNode = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const visited = transformJsxElement(
            node as ts.JsxElement | ts.JsxSelfClosingElement,
            options,
            state,
            factory
          );
          return ts.visitEachChild(visited, visitNode, transformContext);
        }

        return ts.visitEachChild(node, visitNode, transformContext);
      };

      return ts.visitEachChild(sourceFile, visitNode, transformContext);
    };
  };
}

function transformJsxElement(
  element: ts.JsxElement | ts.JsxSelfClosingElement,
  options: TailwindOptions,
  state: TailwindState,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  const info = readStyleAttribute(element);
  if (!info || info.kind !== 'segments') return element;

  const data = {
    info,
    ...collectExtractUtilities(info.segments, state.env.values),
  } satisfies TailwindClassNameResolution;

  if (state.mode === 'inline') return transformInlineClassName(data, factory);
  if (state.mode === 'extract') return transformExtractClassName(data, options, state, factory);

  return element;
}

function transformInlineClassName(
  data: TailwindClassNameResolution,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (data.utilities.length === 0) return data.info.element;

  const staticClasses = factory.createStringLiteral(data.utilities.join(' '));
  const replacement =
    data.passThrough.length === 0
      ? staticClasses
      : factory.createArrayLiteralExpression([staticClasses, ...data.passThrough]);

  return rewriteStyleAttribute(data.info, replacement, factory);
}

function transformExtractClassName(
  data: TailwindClassNameResolution,
  options: TailwindOptions,
  state: TailwindState,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!state.design) throw new Error('@videojs/compiler: tailwind extract mode requires `design` or `input`');

  const segments = data.info.segments;

  let elementResolution: ResolveElementResult | undefined;

  const naming: DeriveClassNameOptions = {
    element: data.info.element,
    segments,
    resolveName(context) {
      elementResolution = normalizeResolveElementResult(options.resolve?.element?.(context));
      if (elementResolution) return elementResolution.className;
      return context.defaultName;
    },
    ...(state.env.hasSource ? { tokenNamespaces: state.env.namespaces, tokenRoots: state.env.roots } : {}),
  };

  const derived = deriveClassName(naming),
    chunk = elementResolution?.chunk,
    explicitSelector = Boolean(elementResolution),
    preserved: string[] = [],
    ruleUtilities: string[] = [];

  for (const utility of data.utilities) {
    const css = analyzeUtility(utility, state.design);

    if (css && css.declarations.length > 0) {
      ruleUtilities.push(utility);
      state.rules.push(buildCompiledRule(derived.className, css, segments, chunk));
      continue;
    }

    if (!preserved.includes(utility)) preserved.push(utility);
  }

  registerScaffoldClassReplacements(
    state.scaffoldClassReplacements,
    data.utilities,
    derived.className,
    data.info.element
  );

  if (ruleUtilities.length > 0 && !explicitSelector) {
    const signature = [...ruleUtilities].sort().join(' ');
    const previous = state.signatures.get(derived.className);
    if (previous === undefined) {
      state.signatures.set(derived.className, signature);
    } else if (previous !== signature) {
      throw collisionError(data.info.element, derived.className, previous, signature);
    }
  }

  const classes = removeReplacedScaffoldClasses([derived.className, ...preserved], state.scaffoldClassReplacements);

  const resolvedClasses =
    options.resolve?.classList?.({
      classes,
      className: derived.className,
      segments,
    }) ?? classes;

  const baseName = resolvedClasses.join(' ');

  const replacement =
    data.passThrough.length === 0
      ? factory.createStringLiteral(baseName)
      : factory.createArrayLiteralExpression([factory.createStringLiteral(baseName), ...data.passThrough]);

  return rewriteStyleAttribute(data.info, replacement, factory);
}

async function renderTailwindAssets(options: TailwindOptions, state: TailwindState, compiler: CompilerContext) {
  if (state.mode !== 'extract' || state.rules.length === 0 || !state.design) return [];
  const vars = options.vars;

  const rendered = await renderCss({
    rules: state.rules,
    ...(options.emit ?? {}),
    ...(vars?.hoist !== undefined ? { hoist: vars.hoist } : {}),
    ...(vars?.inline !== undefined ? { inlineVars: vars.inline } : {}),
    ...(vars?.properties ? { properties: vars.properties } : {}),
    ...(options.resolve?.rule ? { resolveRule: options.resolve.rule } : {}),
    scaffoldClassReplacements: state.scaffoldClassReplacements,
    resolveThemeVar: (name) => state.design!.resolveThemeVar(name),
    ...(vars?.hoist ? { themeSelector: vars.hoist.rootSelector } : {}),
  });

  return cssAssets(compiler, options.output, rendered);
}

async function resolveDesignSystem(options: TailwindOptions, context: CompilerContext): Promise<DesignSystem> {
  if (options.design) return options.design;
  if (!options.input) {
    throw new Error('@videojs/compiler: tailwind extract mode requires `input` when `design` is not provided');
  }
  const input = isAbsolute(options.input) ? options.input : resolvePath(context.configDir, options.input);
  return loadDesignSystem(input);
}

function buildCompiledRule(
  className: string,
  utility: UtilityCss,
  segments: readonly StyleSegment[],
  chunk: string | undefined
): CompiledRule {
  return chunk === undefined ? { className, utility, segments } : { className, utility, segments, chunk };
}

function registerScaffoldClassReplacements(
  replacements: Map<string, string>,
  utilities: readonly string[],
  className: string,
  element: ts.Node
): void {
  for (const utility of utilities) {
    if (!isTailwindScaffoldClass(utility)) continue;
    const previous = replacements.get(utility);
    if (!previous) {
      replacements.set(utility, className);
      continue;
    }
    if (previous !== className) throw scaffoldClassReplacementConflictError(element, utility, previous, className);
  }
}

function removeReplacedScaffoldClasses(
  classes: readonly string[],
  replacements: ReadonlyMap<string, string>
): readonly string[] {
  return classes.filter((className) => !replacements.has(className));
}

function isTailwindScaffoldClass(className: string): boolean {
  return (
    className === 'group' || className === 'peer' || className.startsWith('group/') || className.startsWith('peer/')
  );
}

function collisionError(element: ts.Node, className: string, first: string, next: string): DiagnosticError {
  const tag = tagName(element as Parameters<typeof tagName>[0]);
  return new DiagnosticError(
    `style extraction: class name '${className}' is derived from elements with different styles` +
      `.\n` +
      `  <${tag}> resolves to: ${next}\n` +
      `  an earlier element resolved to: ${first}\n` +
      `Merging these would put conflicting declarations in a single '.${className}' rule. ` +
      `Disambiguate with a distinct token, a distinct component, or \`resolve.element\`.`,
    { ...diagnosticLocationFromNode(element), diagnosticCode: 'style-class-collision' }
  );
}

function scaffoldClassReplacementConflictError(
  element: ts.Node,
  scaffoldClass: string,
  first: string,
  next: string
): DiagnosticError {
  return new DiagnosticError(
    `style extraction: Tailwind scaffold class '${scaffoldClass}' maps to multiple generated classes` +
      `.\n` +
      `  first replacement: .${first}\n` +
      `  next replacement: .${next}\n` +
      `Use a named marker such as \`group/${next}\` or customize \`resolve.rule\` and \`resolve.classList\`.`,
    { ...diagnosticLocationFromNode(element), diagnosticCode: 'style-scaffold-class-replacement-collision' }
  );
}
