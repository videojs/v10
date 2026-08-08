import { basename, extname, isAbsolute, resolve as resolvePath } from 'node:path';
import ts from 'typescript';
import type { CompilerContext, CompilerPlugin } from '../config';
import { diagnosticLocationFromNode } from '../diagnostics';
import { tagName } from '../jsx';
import {
  buildTokenEnv,
  collectExtractUtilities,
  type DeriveClassNameOptions,
  deriveClassName,
  type ResolveTokenModule,
  readStyleAttribute,
  rewriteStyleAttribute,
  type StyleAttributeOpaqueInfo,
  type StyleAttributeSegmentsInfo,
  type StyleSegment,
  type TokenEnv,
} from '../styles';
import { type DesignSystem, loadDesignSystem } from './design-system';
import {
  addStyleRecipe,
  createStyleProgram,
  designForStyleProgram,
  registerGroupPeerBinding,
  type StyleClassRegistry,
  type StyleProgram,
  type StyleProgramCssOptions,
  type StyleRecipeOrigin,
} from './program';
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

export interface TailwindEmitOptions extends StyleProgramCssOptions {}

export interface TailwindOptions {
  /** Styling mode. Defaults to `'preserve'`. */
  mode?: TailwindMode | undefined;
  /** Loaded Tailwind v4 design system. Required for `'extract'` unless `input` is provided. */
  design?: DesignSystem | undefined;
  /** Tailwind CSS entry used to load the design system when `design` is omitted. */
  input?: string | undefined;
  /** CSS asset name for `'extract'`. Defaults to the compiled source basename with `.css`. */
  output?: string | undefined;
  /** Existing style program to collect into. The caller owns `program.emit()`. */
  program?: StyleProgram | undefined;
  /** Validate semantic classes against other independently emitted programs. */
  registry?: StyleClassRegistry | undefined;
  /** Resolution hooks for token modules, generated class names, and CSS chunks. */
  resolve?: TailwindResolveOptions | undefined;
  /** CSS asset emission options for extract mode. */
  emit?: TailwindEmitOptions | undefined;
}

interface TailwindState {
  mode: TailwindMode;
  design?: DesignSystem | undefined;
  env: TokenEnv;
  program?: StyleProgram | undefined;
  ownsProgram: boolean;
}

interface TailwindClassNameResolution {
  info: StyleAttributeSegmentsInfo;
  utilities: readonly string[];
  passThrough: readonly ts.Expression[];
}

interface ExtractedElementStyle {
  className: string;
  chunk?: string | undefined;
  merge?: boolean | undefined;
}

export function tailwind(options: TailwindOptions = {}): CompilerPlugin {
  return {
    name: 'tailwind',
    async setup(compiler) {
      const state = await createTailwindState(options, compiler);

      if (state.mode === 'preserve') return {};

      return {
        transform: createTailwindTransform(options, state),
        ...(state.ownsProgram && state.program
          ? {
              async finish() {
                const result = await state.program!.emit();
                for (const file of result.files) {
                  compiler.addAsset({
                    type: 'css',
                    fileName: file.fileName,
                    source: file.source,
                    sourceFile: compiler.filename,
                  });
                }
              },
            }
          : {}),
      };
    },
  };
}

async function createTailwindState(options: TailwindOptions, compiler: CompilerContext): Promise<TailwindState> {
  const mode = options.mode ?? 'preserve';
  const externalProgram = mode === 'extract' ? options.program : undefined;
  if (externalProgram && (options.design || options.input || options.output || options.registry || options.emit)) {
    throw new Error(
      '@videojs/compiler: a caller-owned StyleProgram also owns `design`, `output`, `registry`, and CSS emission options'
    );
  }
  const design =
    mode === 'extract'
      ? externalProgram
        ? designForStyleProgram(externalProgram)
        : await resolveDesignSystem(options, compiler)
      : undefined;
  const program =
    mode === 'extract'
      ? (externalProgram ??
        createStyleProgram({
          design: design!,
          output: options.output ?? defaultCssFileName(compiler),
          configDir: compiler.configDir,
          ...(options.registry ? { registry: options.registry } : {}),
          ...(options.emit ?? {}),
        }))
      : undefined;

  return {
    mode,
    ...(design ? { design } : {}),
    env: buildTokenEnv(compiler.filename, options.resolve?.tokenModule),
    ...(program ? { program } : {}),
    ownsProgram: Boolean(program && !externalProgram),
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
  if (!state.program) throw new Error('@videojs/compiler: missing StyleProgram in Tailwind extract mode');

  const target = resolveExtractedElementStyle(element, segments, options, state.env);
  const { candidates, preserved } = partitionUtilities(utilities, state.design);
  const origin = styleRecipeOrigin(element);
  registerGroupPeerBindings(state.program, utilities, target.className, target.chunk, origin);

  if (candidates.length > 0) {
    addStyleRecipe(state.program, {
      className: target.className,
      candidates,
      merge: target.merge,
      origin,
      ...(target.chunk === undefined ? {} : { chunk: target.chunk }),
    });
  }

  const classes = removeRelationshipMarkers([target.className, ...preserved]);
  const resolvedClasses =
    options.resolve?.classList?.({
      classes,
      className: target.className,
      segments,
    }) ?? classes;

  return resolvedClasses.join(' ');
}

function resolveExtractedElementStyle(
  element: ts.JsxElement | ts.JsxSelfClosingElement,
  segments: readonly StyleSegment[],
  options: TailwindOptions,
  env: TokenEnv
): ExtractedElementStyle {
  let resolution: ResolveElementResult | undefined;
  const naming: DeriveClassNameOptions = {
    element,
    segments,
    resolveName(context) {
      resolution = normalizeResolveElementResult(options.resolve?.element?.(context));
      return resolution?.className ?? context.defaultName;
    },
    ...(env.hasSource ? { tokenNamespaces: env.namespaces, tokenRoots: env.roots } : {}),
  };
  const derived = deriveClassName(naming);
  return {
    className: derived.className,
    ...(resolution?.chunk === undefined ? {} : { chunk: resolution.chunk }),
    ...(resolution?.merge === undefined ? {} : { merge: resolution.merge }),
  };
}

function partitionUtilities(
  utilities: readonly string[],
  design: DesignSystem
): { candidates: string[]; preserved: string[] } {
  const candidates: string[] = [];
  const preserved: string[] = [];
  for (const utility of utilities) {
    const target = design.recognizesCandidate(utility) ? candidates : preserved;
    if (!target.includes(utility)) target.push(utility);
  }
  return { candidates, preserved };
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

async function resolveDesignSystem(options: TailwindOptions, context: CompilerContext): Promise<DesignSystem> {
  if (options.design) return options.design;
  if (!options.input) {
    throw new Error('@videojs/compiler: tailwind extract mode requires `input` when `design` is not provided');
  }
  const input = isAbsolute(options.input) ? options.input : resolvePath(context.configDir, options.input);
  return loadDesignSystem(input);
}

function registerGroupPeerBindings(
  program: StyleProgram,
  utilities: readonly string[],
  className: string,
  chunk: string | undefined,
  origin: StyleRecipeOrigin
): void {
  for (const utility of utilities) {
    if (!isGroupPeerMarker(utility)) continue;
    registerGroupPeerBinding(program, { marker: utility, className, chunk, origin });
  }
}

function removeRelationshipMarkers(classes: readonly string[]): readonly string[] {
  return classes.filter((className) => !isGroupPeerMarker(className));
}

function isGroupPeerMarker(className: string): boolean {
  return (
    className === 'group' || className === 'peer' || className.startsWith('group/') || className.startsWith('peer/')
  );
}

function styleRecipeOrigin(element: ts.Node): StyleRecipeOrigin {
  return {
    description: `<${tagName(element as Parameters<typeof tagName>[0])}>`,
    ...diagnosticLocationFromNode(element),
  };
}

function defaultCssFileName(context: CompilerContext): string {
  const file = basename(context.outputFile ?? context.filename);
  const extension = extname(file);
  return `${extension ? file.slice(0, -extension.length) : file}.css`;
}
