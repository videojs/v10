import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';
import ts from 'typescript';
import { tagName } from '../matchers';
import { analyzeStyles, type StyleSegment, type StyleVisitor } from '../styles';
import { decompose, type UtilityCss } from './decompose';
import type { DesignSystem } from './design-system';
import {
  type CompiledRule,
  type EmittedCss,
  emitCss,
  type HoistOptions,
  type RegisteredPropertiesOptions,
} from './emit';
import { EvaluationError, loadTokenModule, type TokenValue } from './evaluator';
import { type DeriveClassNameOptions, DiagnosticError, deriveClassName, type NameTransform } from './naming';

/** Output target for `tailwindPlugin`. */
export type TailwindTarget =
  /** Pass-through. JSX `className` values stay as authored. No CSS emitted. */
  | 'tailwind'
  /**
   * Flatten every `cn(...)` call and dotted token reference to a single
   * literal utility string on each `className` prop. No CSS emitted; token
   * imports become unused (handled by `dropUnusedImports`).
   */
  | 'tailwind-inlined'
  /**
   * Rewrite each `className` value to a semantic CSS class name and emit a
   * sibling CSS file containing the compiled rules. The CSS is delivered
   * through the `onCss` callback exactly once per source file.
   */
  | 'vanilla-css';

/** Per-rule annotation hook; lets the consumer assign a `bag` for split-mode emission. */
export type BagFor = (info: { className: string; segments: readonly StyleSegment[] }) => string | undefined;

export interface TailwindPluginOptions {
  /** Loaded Tailwind v4 design system (see `loadDesignSystem`). */
  design: DesignSystem;
  /** Output target. See `TailwindTarget`. */
  target: TailwindTarget;
  /**
   * Absolute path of the source file currently being compiled. Required for
   * `'tailwind-inlined'` and `'vanilla-css'` targets — the plugin resolves
   * relative token imports from this directory.
   */
  sourcePath?: string;
  /**
   * Hook for shaping the final class name (see `NameTransform`). Only used
   * by `'vanilla-css'`. Identity by default.
   */
  transformName?: NameTransform;
  /**
   * Per-tag / per-token-path class-name overrides. Only used by `'vanilla-css'`.
   */
  overrides?: Record<string, string>;
  /**
   * Optional helper that decides which split-mode `bag` a rule belongs to.
   * Only used by `'vanilla-css'`. Returns `undefined` to leave the rule
   * unbagged.
   */
  bagFor?: BagFor;
  /** Receives the full `CompiledRule[]` once per compiled source file. */
  onRules?: (rules: readonly CompiledRule[]) => void;
  /** Convenience hook: pre-emit CSS via `emitCss` and forward the result. */
  onCss?: (css: EmittedCss) => void;
  /** Options forwarded to the internal `emitCss` call when `onCss` is set. */
  emit?: { mode?: 'merged' | 'split'; baseCss?: readonly string[]; configDir?: string };
  /**
   * Hoist uniform CSS variable declarations to a single root rule. See
   * `HoistOptions`. Forwarded to the internal `emitCss` call when `onCss` is
   * set, and exposed on `onRules` consumers via the `hoist` field they may
   * read off the plugin options.
   *
   * Pass `false` to disable. Plugin consumers driving `emitCss` themselves
   * should pass the same value through.
   */
  hoistVars?: false | HoistOptions;
  /**
   * Inline matching CSS custom properties into their consumers, dropping
   * the matching declarations. Same shape as `EmitCssOptions['inlineVars']`:
   *
   *   - `true` — inline `--tw-*` (Tailwind's internal slots).
   *   - `RegExp` — inline any `--name` matching.
   *   - omitted — no inlining.
   *
   * Forwarded to the internal `emitCss` call when `onCss` is set; consumers
   * driving `emitCss` themselves should pass the same value through.
   */
  inlineVars?: true | RegExp;
  /**
   * Handle Tailwind's `@property`-registered slots (`--tw-content`, etc.) that
   * are referenced but never set, so the output isn't broken (e.g.
   * `content: var(--tw-content)`). See `RegisteredPropertiesOptions` — choose
   * `'emit'` (ship `@property` rules) or `'inline'` (bake initial-values in),
   * with an optional `resolve` hook for the per-property config.
   *
   * Forwarded to the internal `emitCss` call when `onCss` is set; consumers
   * driving `emitCss` themselves should pass the same value through.
   */
  properties?: RegisteredPropertiesOptions;
}

/**
 * TS transformer that rewrites JSX `className` attributes per the chosen
 * Tailwind target. Built on top of `analyzeStyles` (generic JSX walker) +
 * `decompose` + `deriveClassName` + `emitCss`. Token references are resolved
 * by statically evaluating the imported token module — see `evaluator.ts`.
 */
export function tailwindPlugin(options: TailwindPluginOptions): ts.TransformerFactory<ts.SourceFile> {
  if (options.target === 'tailwind') {
    return () => (sourceFile) => sourceFile;
  }
  if (options.target === 'tailwind-inlined') {
    return inlinedPlugin(options);
  }
  return vanillaCssPlugin(options);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Target: tailwind-inlined
 * ───────────────────────────────────────────────────────────────────────── */

function inlinedPlugin(options: TailwindPluginOptions): ts.TransformerFactory<ts.SourceFile> {
  const env = buildTokenEnv(options.sourcePath);

  return (transformContext) => {
    return (sourceFile) => {
      const visit: StyleVisitor = (info, factory) => {
        if (info.kind !== 'segments' || !info.segments) return undefined;
        const flat = flattenToLiteral(info.segments, env);
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

function vanillaCssPlugin(options: TailwindPluginOptions): ts.TransformerFactory<ts.SourceFile> {
  const { design, transformName, overrides, bagFor, onRules, onCss, emit, hoistVars, inlineVars, properties } = options;

  const env = buildTokenEnv(options.sourcePath);

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
          ...(transformName ? { transformName } : {}),
          ...(overrides ? { overrides } : {}),
        };
        const derived = deriveClassName(naming);

        // Resolve each segment against the env. Literals resolve to themselves;
        // tokens resolve via path walking; opaques and unresolved tokens are
        // *passed through* — those are runtime expressions (e.g. a `className`
        // prop the consumer composes onto the element). We rewrite the
        // classname to the derived semantic name and wrap any pass-throughs in
        // a `cn(...)` call so composition is preserved.
        const passThrough: ts.Expression[] = [];
        const preserved: string[] = [];
        // Every utility this element resolves to (rule-producing or preserved),
        // for the collision signature below.
        const utilities: string[] = [];

        // Compile one utility: emit a rule when it produces declarations,
        // otherwise *preserve* it as a literal class. Utilities that yield no
        // declarations are markers (`group`, `peer`, `group/<name>`) or classes
        // Tailwind doesn't recognize — dropping them would silently break every
        // descendant `group-*` / `peer-*` variant that targets the marker.
        const handleUtility = (utility: string): void => {
          utilities.push(utility);
          const css = decompose(utility, design);
          if (css && css.declarations.length > 0) {
            rules.push(buildCompiledRule(derived.className, css, segments, bagFor));
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
            const literal = resolveTokenPath(seg.path, env);
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
        if (utilities.length > 0) {
          const signature = [...utilities].sort().join(' ');
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
        return factory.createCallExpression(factory.createIdentifier('cn'), undefined, [
          factory.createStringLiteral(baseName),
          ...passThrough,
        ]);
      };

      const transformed = analyzeStyles({ visit })(transformContext)(sourceFile);

      if (rules.length === 0) return transformed;

      onRules?.(rules);

      if (onCss) {
        // Scope the emitted theme variables to the skin's hoist root when one
        // is configured, so they don't leak to a global `:root`.
        const themeSelector = hoistVars ? hoistVars.rootSelector : undefined;
        emitCss({
          rules,
          ...(emit ?? {}),
          ...(hoistVars !== undefined ? { hoist: hoistVars } : {}),
          ...(inlineVars !== undefined ? { inlineVars } : {}),
          ...(properties ? { properties } : {}),
          resolveThemeVar: (name) => design.resolveThemeVar(name),
          ...(themeSelector ? { themeSelector } : {}),
        })
          .then(onCss)
          .catch(() => {
            // Swallowed; a misconfigured baseCss shouldn't crash the build.
          });
      }

      return transformed;
    };
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Token environment
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Discover the token-namespace imports in the skin source and evaluate each
 * referenced module on disk. Also folds local `const X = cn(<resolvable>)`
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
function buildTokenEnv(sourcePath: string | undefined): Map<string, TokenValue> {
  const env = new Map<string, TokenValue>();
  if (!sourcePath || !existsSync(sourcePath)) return env;

  const source = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // First pass: import declarations.
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const specifier = stmt.moduleSpecifier;
    if (!ts.isStringLiteral(specifier)) continue;
    const id = specifier.text;
    if (!id.startsWith('.')) continue;

    const absolutePath = resolveModulePath(id, sourcePath);
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
        if (value !== undefined) env.set(localName, value);
      }
      continue;
    }

    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      env.set(clause.namedBindings.name.text, exports as TokenValue);
    }
  }

  // Second pass: top-level `const X = <expr>` declarations whose RHS resolves
  // statically against the env. Lets skins write
  //   const iconButton = cn(styles.button.base, styles.button.icon);
  // and reference `iconButton` in `className={iconButton}` without losing
  // the resolution.
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const value = tryEvaluateLocal(decl.initializer, env);
      if (value !== null) env.set(decl.name.text, value);
    }
  }

  return env;
}

/**
 * Evaluate a local declaration's RHS against `env`. Supports `cn(...)` calls,
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
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'cn') {
    const parts: string[] = [];
    for (const arg of node.arguments) {
      const v = tryEvaluateLocal(arg, env);
      if (v === null || typeof v !== 'string') return null;
      if (v) parts.push(v);
    }
    return parts.join(' ');
  }
  if (ts.isParenthesizedExpression(node)) return tryEvaluateLocal(node.expression, env);
  return null;
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'] as const;

function resolveModulePath(specifier: string, fromFile: string): string | null {
  const base = isAbsolute(specifier) ? specifier : resolvePath(dirname(fromFile), specifier);
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
  bagFor: BagFor | undefined
): CompiledRule {
  const bag = bagFor?.({ className, segments });
  return bag === undefined ? { className, utility } : { className, utility, bag };
}

function collisionError(element: ts.Node, className: string, first: string, next: string): DiagnosticError {
  const tag = tagName(element as Parameters<typeof tagName>[0]);
  const sourceFile = element.getSourceFile?.();
  const loc = sourceFile ? sourceFile.getLineAndCharacterOfPosition(element.pos) : undefined;
  const fileName = sourceFile?.fileName;
  const line = loc ? loc.line + 1 : undefined;
  return new DiagnosticError(
    `vanilla-css: class name '${className}' is derived from elements with different styles` +
      `${fileName ? ` (this one at ${fileName}:${line})` : ''}.\n` +
      `  <${tag}> resolves to: ${next}\n` +
      `  an earlier element resolved to: ${first}\n` +
      `Merging these would put conflicting declarations in a single '.${className}' rule. ` +
      `Disambiguate with a distinct token, a distinct component, or an \`overrides\` entry.`,
    fileName,
    line
  );
}
