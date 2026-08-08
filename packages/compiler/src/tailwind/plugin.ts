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
  type StyleAttributeOpaqueInfo,
  type StyleAttributeSegmentsInfo,
  type StyleSegment,
  type TokenEnv,
} from '../styles';
import { cssAssets } from './css/assets';
import { lowerCss } from './css/lower';
import { type DesignSystem, loadDesignSystem } from './design-system';
import { addStyleRecipe, createStyleProgram, finalizeStyleProgram, type MutableStyleProgram } from './program';
import {
  normalizeResolveElementResult,
  type ResolveClassList,
  type ResolveElement,
  type ResolveElementResult,
} from './selectors';

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
  /** Selector for referenced Tailwind theme variables. Defaults to `:root`. */
  themeSelector?: string | undefined;
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
}

interface TailwindState {
  mode: TailwindMode;
  design?: DesignSystem | undefined;
  env: TokenEnv;
  program: MutableStyleProgram;
  signatures: Map<string, string>;
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
    program: createStyleProgram(),
    signatures: new Map(),
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

      const transformed = ts.visitEachChild(sourceFile, visitNode, transformContext);
      return factory.updateSourceFile(
        transformed,
        transformed.statements.filter(
          (statement) =>
            !(
              ts.isImportDeclaration(statement) &&
              ts.isStringLiteral(statement.moduleSpecifier) &&
              state.env.modules.has(statement.moduleSpecifier.text) &&
              tokenImportIsUnused(statement, transformed)
            )
        )
      );
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
  if (!info) return element;
  if (info.kind === 'opaque') return transformConditionalClassName(info, options, state, factory);

  const data = {
    info,
    ...collectExtractUtilities(info.segments, state.env.values),
  } satisfies TailwindClassNameResolution;

  if (state.mode === 'inline') return transformInlineClassName(data, factory);
  if (state.mode === 'extract') return transformExtractClassName(data, options, state, factory);

  return element;
}

function transformConditionalClassName(
  info: StyleAttributeOpaqueInfo,
  options: TailwindOptions,
  state: TailwindState,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!ts.isConditionalExpression(info.expression)) return info.element;
  const whenTrue = conditionalBranch(info.expression.whenTrue, state);
  const whenFalse = conditionalBranch(info.expression.whenFalse, state);
  if (!whenTrue || !whenFalse) return info.element;

  const trueClass =
    state.mode === 'inline'
      ? whenTrue.utilities.join(' ')
      : extractStaticClassName(info.element, whenTrue.segments, whenTrue.utilities, options, state);
  const falseClass =
    state.mode === 'inline'
      ? whenFalse.utilities.join(' ')
      : extractStaticClassName(info.element, whenFalse.segments, whenFalse.utilities, options, state);
  const expression = factory.updateConditionalExpression(
    info.expression,
    info.expression.condition,
    info.expression.questionToken,
    factory.createStringLiteral(trueClass),
    info.expression.colonToken,
    factory.createStringLiteral(falseClass)
  );
  return rewriteStyleAttribute(info, expression, factory);
}

function conditionalBranch(
  expression: ts.Expression,
  state: TailwindState
): { segments: readonly StyleSegment[]; utilities: readonly string[] } | null {
  const segment = styleSegment(expression);
  if (!segment) return null;
  const resolved = collectExtractUtilities([segment], state.env.values);
  if (resolved.passThrough.length > 0 || resolved.utilities.length === 0) return null;
  return { segments: [segment], utilities: resolved.utilities };
}

function styleSegment(expression: ts.Expression): StyleSegment | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { kind: 'literal', value: expression.text, node: expression };
  }
  const path = dottedPath(expression);
  return path ? { kind: 'token', path, node: expression as ts.Identifier | ts.PropertyAccessExpression } : null;
}

function dottedPath(expression: ts.Expression): readonly string[] | null {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (!ts.isPropertyAccessExpression(expression)) return null;
  const head = dottedPath(expression.expression);
  return head ? [...head, expression.name.text] : null;
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
  const baseName = extractStaticClassName(data.info.element, data.info.segments, data.utilities, options, state);
  const replacement =
    data.passThrough.length === 0
      ? factory.createStringLiteral(baseName)
      : factory.createArrayLiteralExpression([factory.createStringLiteral(baseName), ...data.passThrough]);

  return rewriteStyleAttribute(data.info, replacement, factory);
}

function extractStaticClassName(
  element: ts.JsxElement | ts.JsxSelfClosingElement,
  segments: readonly StyleSegment[],
  utilities: readonly string[],
  options: TailwindOptions,
  state: TailwindState
): string {
  if (!state.design) throw new Error('@videojs/compiler: tailwind extract mode requires `design` or `input`');

  let elementResolution: ResolveElementResult | undefined;

  const naming: DeriveClassNameOptions = {
    element,
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

  for (const utility of utilities) {
    if (state.design.recognizesCandidate(utility)) {
      ruleUtilities.push(utility);
      continue;
    }

    if (!preserved.includes(utility)) preserved.push(utility);
  }

  registerScaffoldClassReplacements(
    state.program.scaffoldClassReplacementsByChunk,
    utilities,
    derived.className,
    chunk,
    element
  );

  if (ruleUtilities.length > 0 && !explicitSelector) {
    const signature = [...ruleUtilities].sort().join(' ');
    const previous = state.signatures.get(derived.className);
    if (previous === undefined) {
      state.signatures.set(derived.className, signature);
    } else if (previous !== signature) {
      throw collisionError(element, derived.className, previous, signature);
    }
  }

  if (ruleUtilities.length > 0) {
    addStyleRecipe(state.program, {
      className: derived.className,
      candidates: ruleUtilities,
      segments,
      ...(chunk === undefined ? {} : { chunk }),
    });
  }

  const classes = removeReplacedScaffoldClasses([derived.className, ...preserved]);

  const resolvedClasses =
    options.resolve?.classList?.({
      classes,
      className: derived.className,
      segments,
    }) ?? classes;

  return resolvedClasses.join(' ');
}

function tokenImportIsUnused(statement: ts.ImportDeclaration, sourceFile: ts.SourceFile): boolean {
  const clause = statement.importClause;
  if (!clause) return true;
  const names = new Set<string>();
  if (clause.name) names.add(clause.name.text);
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.add(clause.namedBindings.name.text);
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const specifier of clause.namedBindings.elements) names.add(specifier.name.text);
  }

  let referenced = false;
  const visit = (node: ts.Node): void => {
    if (referenced || node === statement) return;
    if (ts.isIdentifier(node) && names.has(node.text)) {
      referenced = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return !referenced;
}

async function renderTailwindAssets(options: TailwindOptions, state: TailwindState, compiler: CompilerContext) {
  if (state.mode !== 'extract' || state.program.recipes.size === 0 || !state.design) return [];

  const rendered = await lowerCss({
    design: state.design,
    program: finalizeStyleProgram(state.program),
    ...(options.emit ?? {}),
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

function registerScaffoldClassReplacements(
  replacementsByChunk: Map<string, Map<string, string>>,
  utilities: readonly string[],
  className: string,
  chunk: string | undefined,
  element: ts.Node
): void {
  const chunkKey = chunk ?? '';
  let replacements = replacementsByChunk.get(chunkKey);
  if (!replacements) {
    replacements = new Map();
    replacementsByChunk.set(chunkKey, replacements);
  }

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

function removeReplacedScaffoldClasses(classes: readonly string[]): readonly string[] {
  return classes.filter((className) => !isTailwindScaffoldClass(className));
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
      `Use a named marker such as \`group/${next}\` to disambiguate the relationship.`,
    { ...diagnosticLocationFromNode(element), diagnosticCode: 'style-scaffold-class-replacement-collision' }
  );
}
