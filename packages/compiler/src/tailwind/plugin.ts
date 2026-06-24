import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, resolve as resolvePath } from 'node:path';
import ts from 'typescript';
import type { CompilerContext, CompilerPlugin } from '../config';
import { diagnosticLocationFromNode } from '../diagnostics';
import { tagName } from '../jsx';
import { analyzeStyles, type StyleSegment, type StyleVisitor } from '../styles';
import { type DesignSystem, loadDesignSystem } from './design-system';
import {
  type CompiledRule,
  type EmittedCss,
  emitCss,
  type HoistOptions,
  type RegisteredPropertiesOptions,
} from './emit';
import { EvaluationError, loadTokenModule, type TokenValue } from './evaluator';
import { type DeriveClassNameOptions, DiagnosticError, deriveClassName, type ResolveName } from './naming';
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

/** Per-rule grouping hook. */
export type ResolveGroup = (info: { className: string; segments: readonly StyleSegment[] }) => string | undefined;

export type ResolveTokenModule = (specifier: string, fromFile: string) => string | null | undefined;

export interface TailwindResolveOptions {
  /** Resolve bare token imports in skin sources to token modules on disk. Relative imports use the default resolver. */
  tokenModule?: ResolveTokenModule | undefined;
  /** Resolve the final CSS class name from component/token/literal candidates. */
  name?: ResolveName | undefined;
  /** Assign an extracted rule to a logical CSS group. */
  group?: ResolveGroup | undefined;
}

export interface TailwindEmitOptions {
  /** CSS emission layout. Defaults to merged output. */
  mode?: 'merged' | 'split';
  /** Base CSS files to prepend to emitted output. */
  baseCss?: readonly string[];
  /** Directory used to resolve relative base CSS paths. */
  configDir?: string;
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
  /** Resolution hooks for token modules, generated class names, and rule groups. */
  resolve?: TailwindResolveOptions | undefined;
  /** CSS asset emission options for extract mode. */
  emit?: TailwindEmitOptions | undefined;
  /** CSS custom property handling options for extract mode. */
  vars?: TailwindVarsOptions | undefined;
}

interface TailwindTransformOptions extends Omit<TailwindOptions, 'input' | 'output'> {
  mode: TailwindMode;
  sourcePath?: string | undefined;
  onRules?: ((rules: readonly CompiledRule[]) => void) | undefined;
}

export function tailwind(options: TailwindOptions = {}): CompilerPlugin {
  return {
    name: 'tailwind',
    async setup(context) {
      const mode = options.mode ?? 'preserve';

      if (mode === 'preserve') return {};

      if (mode === 'inline') {
        return {
          transform: tailwindPlugin({ ...options, mode, sourcePath: context.filename }),
        };
      }

      const design = await resolveDesignSystem(options, context);
      const rules: CompiledRule[] = [];

      return {
        transform: tailwindPlugin({
          ...options,
          mode,
          design,
          sourcePath: context.filename,
          onRules: (nextRules) => {
            rules.push(...nextRules);
          },
        }),
        async finish() {
          if (rules.length === 0) return;
          const vars = options.vars;
          const emitted = await emitCss({
            rules,
            ...(options.emit ?? {}),
            ...(vars?.hoist !== undefined ? { hoist: vars.hoist } : {}),
            ...(vars?.inline !== undefined ? { inlineVars: vars.inline } : {}),
            ...(vars?.properties ? { properties: vars.properties } : {}),
            resolveThemeVar: (name) => design.resolveThemeVar(name),
            ...(vars?.hoist ? { themeSelector: vars.hoist.rootSelector } : {}),
          });
          addCssAssets(context, options.output, emitted);
        },
      };
    },
  };
}

/**
 * TS transformer that rewrites JSX `className` attributes per the chosen
 * Tailwind target. Built on top of `analyzeStyles` (generic JSX walker) +
 * `analyzeUtility` + `deriveClassName` + `emitCss`. Token references are resolved
 * by statically evaluating the imported token module — see `evaluator.ts`.
 */
export function tailwindPlugin(options: TailwindTransformOptions): ts.TransformerFactory<ts.SourceFile> {
  if (options.mode === 'preserve') {
    return () => (sourceFile) => sourceFile;
  }
  if (options.mode === 'inline') {
    return inlinedPlugin(options);
  }
  if (!options.design) {
    throw new Error('@videojs/compiler: tailwind extract mode requires `design` or `input`');
  }
  return vanillaCssPlugin({ ...options, design: options.design });
}

/* ─────────────────────────────────────────────────────────────────────────
 * Target: tailwind-inlined
 * ───────────────────────────────────────────────────────────────────────── */

function inlinedPlugin(options: TailwindTransformOptions): ts.TransformerFactory<ts.SourceFile> {
  const env = buildTokenEnv(options.sourcePath, options.resolve?.tokenModule);

  return (transformContext) => {
    return (sourceFile) => {
      const visit: StyleVisitor = (info, factory) => {
        if (info.kind !== 'segments' || !info.segments) return undefined;
        const flat = flattenToLiteral(info.segments, env.values);
        if (flat === null) return undefined;
        return factory.createStringLiteral(flat);
      };

      return analyzeStyles({ visit })(transformContext)(sourceFile);
    };
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Target: vanilla-css
 * ───────────────────────────────────────────────────────────────────────── */

function vanillaCssPlugin(
  options: TailwindTransformOptions & { design: DesignSystem }
): ts.TransformerFactory<ts.SourceFile> {
  const { design, resolve, onRules } = options;

  const env = buildTokenEnv(options.sourcePath, resolve?.tokenModule);

  return (transformContext) => {
    return (sourceFile) => {
      const rules: CompiledRule[] = [];
      // Per derived class name, the sorted utility signature of the first
      // element that produced it. Lets us detect when two *different* source
      // elements collapse onto the same class name with *different* styles —
      // emitCss would silently merge their declarations into one rule.
      const signatures = new Map<string, string>();

      const visit: StyleVisitor = (info, factory) => {
        if (info.kind !== 'segments' || !info.segments) return undefined;
        // Capture the narrowed segments so the closures below keep the type.
        const segments = info.segments;

        const naming: DeriveClassNameOptions = {
          element: info.element,
          segments,
          ...(resolve?.name ? { resolveName: resolve.name } : {}),
          ...(env.hasSource ? { tokenNamespaces: env.namespaces, tokenRoots: env.roots } : {}),
        };
        const derived = deriveClassName(naming);

        // Resolve each segment against the env. Literals resolve to themselves;
        // tokens resolve via path walking; opaques and unresolved tokens are
        // *passed through* — those are runtime expressions (e.g. a `className`
        // prop the consumer composes onto the element). We rewrite the
        // className to the derived semantic name and preserve pass-throughs in
        // an array so target generators can choose how to merge.
        const passThrough: ts.Expression[] = [];
        const preserved: string[] = [];
        // Rule-producing utilities only. Preserved marker classes stay on the
        // element and don't participate in generated CSS rule merging.
        const ruleUtilities: string[] = [];

        // Compile one utility: emit a rule when it produces declarations,
        // otherwise *preserve* it as a literal class. Utilities that yield no
        // declarations are markers (`group`, `peer`, `group/<name>`) or classes
        // Tailwind doesn't recognize — dropping them would silently break every
        // descendant `group-*` / `peer-*` variant that targets the marker.
        const handleUtility = (utility: string): void => {
          const css = analyzeUtility(utility, design);
          if (css && css.declarations.length > 0) {
            ruleUtilities.push(utility);
            rules.push(buildCompiledRule(derived.className, css, segments, resolve?.group));
            return;
          }
          if (!preserved.includes(utility)) preserved.push(utility);
        };

        for (const seg of segments) {
          if (seg.kind === 'literal') {
            for (const utility of seg.value.split(/\s+/)) {
              if (utility) handleUtility(utility);
            }
            continue;
          }
          if (seg.kind === 'token') {
            const literal = resolveTokenPath(seg.path, env.values);
            if (literal !== null) {
              for (const utility of literal.split(/\s+/)) {
                if (utility) handleUtility(utility);
              }
              continue;
            }
            // Fall through — token didn't resolve, treat as pass-through.
          }
          passThrough.push(seg.node);
        }

        // Collision guard: two distinct elements that derive the same class
        // name must resolve to the same utilities. Identical recurrences (e.g.
        // many `<Tooltip.Popup>` with the same token) share a signature and are
        // fine; differing ones would merge conflicting declarations into one
        // rule, so we fail loudly with a fixable diagnostic.
        if (ruleUtilities.length > 0) {
          const signature = [...ruleUtilities].sort().join(' ');
          const previous = signatures.get(derived.className);
          if (previous === undefined) {
            signatures.set(derived.className, signature);
          } else if (previous !== signature) {
            throw collisionError(info.element, derived.className, previous, signature);
          }
        }

        const baseName = preserved.length > 0 ? `${derived.className} ${preserved.join(' ')}` : derived.className;

        if (passThrough.length === 0) {
          return factory.createStringLiteral(baseName);
        }
        return factory.createArrayLiteralExpression([factory.createStringLiteral(baseName), ...passThrough]);
      };

      const transformed = analyzeStyles({ visit })(transformContext)(sourceFile);

      if (rules.length === 0) return transformed;

      onRules?.(rules);

      return transformed;
    };
  };
}

async function resolveDesignSystem(options: TailwindOptions, context: CompilerContext): Promise<DesignSystem> {
  if (options.design) return options.design;
  if (!options.input) {
    throw new Error('@videojs/compiler: tailwind extract mode requires `input` when `design` is not provided');
  }
  const input = isAbsolute(options.input) ? options.input : resolvePath(context.configDir, options.input);
  return loadDesignSystem(input);
}

function addCssAssets(context: CompilerContext, output: string | undefined, emitted: EmittedCss): void {
  if (emitted.kind === 'merged') {
    context.addAsset({
      type: 'css',
      fileName: output ?? defaultCssFileName(context),
      source: emitted.css,
      sourceFile: context.filename,
    });
    return;
  }

  const indexFile = output ?? defaultCssFileName(context);
  context.addAsset({ type: 'css', fileName: indexFile, source: emitted.index, sourceFile: context.filename });
  const dir = dirname(indexFile);
  for (const [group, source] of emitted.groups) {
    context.addAsset({
      type: 'css',
      fileName: join(dir, `${group}.css`),
      source,
      sourceFile: context.filename,
    });
  }
}

function defaultCssFileName(context: CompilerContext): string {
  const file = basename(context.outputFile ?? context.filename);
  const ext = extname(file);
  return `${ext ? file.slice(0, -ext.length) : file}.css`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Token environment
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Discover the token-namespace imports in the skin source and evaluate each
 * referenced module on disk. Also folds local `const X = [<resolvable>]`
 * declarations into the env so JSX `className={X}` references resolve.
 *
 * Reads + reparses the source file from disk rather than walking the in-flight
 * SourceFile — earlier transforms in the pipeline (e.g. `transformImports`)
 * may have rewritten relative specifiers to bare ones, which would defeat the
 * on-disk module resolution we need here.
 *
 * If `sourcePath` is undefined or unreadable, returns an empty map; the plugin
 * then leaves token-bearing className expressions alone.
 */
interface TokenEnv {
  values: Map<string, TokenValue>;
  namespaces: Set<string>;
  roots: Set<string>;
  hasSource: boolean;
}

function buildTokenEnv(sourcePath: string | undefined, tokenModuleResolver?: ResolveTokenModule | undefined): TokenEnv {
  const env: TokenEnv = {
    values: new Map<string, TokenValue>(),
    namespaces: new Set<string>(),
    roots: new Set<string>(),
    hasSource: false,
  };
  if (!sourcePath || !existsSync(sourcePath)) return env;
  env.hasSource = true;

  const source = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // First pass: import declarations.
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const specifier = stmt.moduleSpecifier;
    if (!ts.isStringLiteral(specifier)) continue;
    const id = specifier.text;
    const absolutePath = resolveTokenImport(id, sourcePath, tokenModuleResolver);
    if (!absolutePath) continue;

    let exports: Record<string, TokenValue>;
    try {
      exports = loadTokenModule(absolutePath);
    } catch (error) {
      if (error instanceof EvaluationError) {
        // Token grammar violation — skip this import so the className is
        // treated as opaque rather than crashing the build.
        continue;
      }
      throw error;
    }

    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const spec of clause.namedBindings.elements) {
        const sourceName = spec.propertyName?.text ?? spec.name.text;
        const localName = spec.name.text;
        const value = exports[sourceName];
        if (value !== undefined) {
          setTokenValue(env, localName, value);
          if (isTokenNamespaceImport(sourceName, localName, value)) env.namespaces.add(localName);
        }
      }
      continue;
    }

    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      env.namespaces.add(clause.namedBindings.name.text);
      setTokenValue(env, clause.namedBindings.name.text, exports as TokenValue);
    }
  }

  // Second pass: top-level `const X = <expr>` declarations whose RHS resolves
  // statically against the env. Lets skins write
  //   const iconButton = [styles.button.base, styles.button.icon];
  // and reference `iconButton` in `className={iconButton}` without losing
  // the resolution.
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const value = tryEvaluateLocal(decl.initializer, env.values);
      if (value !== null) setTokenValue(env, decl.name.text, value);
    }
  }

  return env;
}

function setTokenValue(env: TokenEnv, name: string, value: TokenValue): void {
  env.values.set(name, value);
  env.roots.add(name);
}

function isTokenNamespaceImport(sourceName: string, localName: string, value: TokenValue): boolean {
  if (typeof value === 'string') return false;
  return sourceName === 'tokens' || sourceName === 'styles' || localName === 'tokens' || localName === 'styles';
}

/**
 * Evaluate a local declaration's RHS against `env`. Supports className arrays,
 * dotted access, identifier lookup, and string literals — same surface as the
 * token-module evaluator, but without nested object literals (skins don't
 * declare those locally) and without recursion across files.
 */
function tryEvaluateLocal(node: ts.Expression, env: Map<string, TokenValue>): TokenValue | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isIdentifier(node)) {
    const v = env.get(node.text);
    return v ?? null;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const root = tryEvaluateLocal(node.expression, env);
    if (root === null || typeof root === 'string') return null;
    if (!ts.isIdentifier(node.name)) return null;
    const next = root[node.name.text];
    return next ?? null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const parts: string[] = [];
    for (const item of node.elements) {
      if (ts.isSpreadElement(item)) return null;
      const v = tryEvaluateLocal(item, env);
      if (v === null || typeof v !== 'string') return null;
      if (v) parts.push(v);
    }
    return parts.join(' ');
  }
  if (ts.isParenthesizedExpression(node)) return tryEvaluateLocal(node.expression, env);
  return null;
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'] as const;

function resolveTokenImport(
  specifier: string,
  fromFile: string,
  tokenModuleResolver?: ResolveTokenModule | undefined
): string | null {
  if (specifier.startsWith('.')) return resolveModulePath(specifier, fromFile);
  const resolved = tokenModuleResolver?.(specifier, fromFile);
  if (!resolved) return null;
  return isAbsolute(resolved) ? resolved : resolvePath(dirname(fromFile), resolved);
}

function resolveModulePath(specifier: string, fromFile: string): string | null {
  const base = isAbsolute(specifier) ? specifier : resolvePath(dirname(fromFile), specifier);
  if (extname(base) && existsSync(base)) return base;
  for (const ext of MODULE_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Segment → utility resolution
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Resolve every segment to a string. Returns `null` for opaque expressions
 * or token paths that can't be walked against the env (so the caller can
 * leave the source unchanged).
 */
function collectUtilities(segments: readonly StyleSegment[], env: Map<string, TokenValue>): string[] | null {
  const out: string[] = [];
  for (const seg of segments) {
    if (seg.kind === 'literal') {
      pushUtilities(out, seg.value);
      continue;
    }
    if (seg.kind === 'token') {
      const literal = resolveTokenPath(seg.path, env);
      if (literal === null) return null;
      pushUtilities(out, literal);
      continue;
    }
    return null;
  }
  return out;
}

function flattenToLiteral(segments: readonly StyleSegment[], env: Map<string, TokenValue>): string | null {
  const utilities = collectUtilities(segments, env);
  if (utilities === null) return null;
  return utilities.join(' ');
}

/**
 * Walk `path` (e.g. `['styles', 'button', 'icon']`) against the env. The head
 * segment is the local namespace name (or a top-level local const); subsequent
 * segments index into the resolved object. Returns `null` if the path doesn't
 * resolve to a string.
 */
function resolveTokenPath(path: readonly string[], env: Map<string, TokenValue>): string | null {
  if (path.length === 0) return null;
  const [head, ...rest] = path;
  const root = env.get(head!);
  if (root === undefined) return null;

  let cursor: TokenValue = root;
  for (const key of rest) {
    if (typeof cursor === 'string') return null;
    const next = cursor[key];
    if (next === undefined) return null;
    cursor = next;
  }
  return typeof cursor === 'string' ? cursor : null;
}

function pushUtilities(out: string[], raw: string): void {
  for (const u of raw.split(/\s+/)) {
    if (u.length > 0) out.push(u);
  }
}

function buildCompiledRule(
  className: string,
  utility: UtilityCss,
  segments: readonly StyleSegment[],
  resolveGroup: ResolveGroup | undefined
): CompiledRule {
  const group = resolveGroup?.({ className, segments });
  return group === undefined ? { className, utility } : { className, utility, group };
}

function collisionError(element: ts.Node, className: string, first: string, next: string): DiagnosticError {
  const tag = tagName(element as Parameters<typeof tagName>[0]);
  return new DiagnosticError(
    `vanilla-css: class name '${className}' is derived from elements with different styles` +
      `.\n` +
      `  <${tag}> resolves to: ${next}\n` +
      `  an earlier element resolved to: ${first}\n` +
      `Merging these would put conflicting declarations in a single '.${className}' rule. ` +
      `Disambiguate with a distinct token, a distinct component, or \`resolve.name\`.`,
    { ...diagnosticLocationFromNode(element), diagnosticCode: 'tailwind-class-collision' }
  );
}
