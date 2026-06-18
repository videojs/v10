import { kebabCase } from '@videojs/utils/string';
import { type DiagnosticLocation, diagnosticLocationFromNode } from '../diagnostics';
import type { JsxElementLike } from '../matchers';
import { tagName } from '../matchers';
import type { StyleSegment } from '../styles';

/** Result of deriving a CSS class name for a JSX element. */
export interface DerivedClassName {
  /** The full class name. */
  className: string;
  /** Which derivation rule produced the name. */
  source: 'tag' | 'token-path' | 'literal' | 'override';
}

/** Context passed to a `NameTransform`. */
export type NameContext =
  | {
      /** Derivation came from a JSX component tag. */
      source: 'tag';
      /** The original tag (e.g. `'Foo'` or `'Foo.Bar'`). */
      tag: string;
      /** Default name the compiler would emit (kebab-cased, dotted parts joined with `-`). */
      defaultName: string;
    }
  | {
      /** Derivation came from a dotted token reference on a bare HTML element. */
      source: 'token-path';
      /** The original token path (e.g. `['styles', 'foo', 'bar']`). */
      tokenPath: readonly string[];
      /** Default name the compiler would emit (leading namespace dropped, kebab-cased, joined with `-`). */
      defaultName: string;
    };

/**
 * Hook for transforming the derived class name. Receives the original input
 * (tag or token path) plus the default kebab-cased name; returns the final
 * class name. Identity by default.
 */
export type NameTransform = (context: NameContext) => string;

export interface DeriveClassNameOptions {
  /** The element whose class name we're deriving. */
  element: JsxElementLike;
  /**
   * Segments parsed from the element's `className` (when `kind: 'segments'`).
   * Used as a fallback when the element is bare HTML.
   */
  segments?: readonly StyleSegment[];
  /**
   * Optional hook for shaping the final class name. Receives both the
   * derivation source (tag or token path) and the default name; returns
   * whatever class name the consumer wants. Defaults to identity.
   */
  transformName?: NameTransform;
  /**
   * Per-tag or per-token-path overrides. Keyed by JSX tag (`'Foo'`,
   * `'Foo.Bar'`) or by a dotted token path joined with `.`
   * (`'styles.foo.bar'`); value is the literal class name to emit.
   * Overrides win over `transformName`.
   */
  overrides?: Record<string, string>;
  /**
   * Local identifiers that are namespace imports for token modules. When
   * provided, only these leading path segments are dropped from token names.
   */
  tokenNamespaces?: ReadonlySet<string>;
  /** Local identifiers known to resolve to style tokens. */
  tokenRoots?: ReadonlySet<string>;
}

/**
 * Diagnostic thrown when no rule matches — typically a bare HTML element
 * with arbitrary class strings and no token-path indication of intent.
 * Resolution is up to the consumer (move classes onto a component,
 * extract a token, add an override).
 */
export class DiagnosticError extends Error {
  public readonly diagnosticCode: string;
  public readonly fileName?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly endLine?: number;
  public readonly endColumn?: number;
  public readonly sourceText?: string;

  constructor(
    message: string,
    location?: (DiagnosticLocation & { diagnosticCode?: string | undefined }) | string | undefined,
    line?: number
  ) {
    super(message);
    this.name = 'DiagnosticError';
    if (typeof location === 'string') {
      this.fileName = location;
      if (line !== undefined) this.line = line;
      this.diagnosticCode = 'tailwind-diagnostic';
      return;
    }

    this.diagnosticCode = location?.diagnosticCode ?? 'tailwind-diagnostic';
    if (location?.file) this.fileName = location.file;
    if (location?.line !== undefined) this.line = location.line;
    if (location?.column !== undefined) this.column = location.column;
    if (location?.endLine !== undefined) this.endLine = location.endLine;
    if (location?.endColumn !== undefined) this.endColumn = location.endColumn;
    if (location?.sourceText) this.sourceText = location.sourceText;
  }
}

/**
 * Derive a semantic CSS class name for a JSX element.
 *
 * Priority order:
 *   1. **Override** — `overrides[tag]` or `overrides[token-path]` if set.
 *   2. **Token path** — when className references style tokens. The
 *      most specific dotted token path names the class. Leading namespace
 *      identifier is dropped; remaining parts kebab-cased and joined with `-`.
 *      Result passed through `transformName`.
 *   3. **JSX component tag** — kebab-cased, dotted parts joined with `-`.
 *      Result passed through `transformName` for final shaping.
 *   4. **Literal utility** — for bare HTML elements with one simple literal
 *      utility, reuse that utility as the class name.
 *   5. **Diagnostic** — no rule matched; throws `DiagnosticError`.
 */
export function deriveClassName(opts: DeriveClassNameOptions): DerivedClassName {
  const overrides = opts.overrides ?? {};
  const transform: NameTransform = opts.transformName ?? ((ctx) => ctx.defaultName);

  const tag = tagName(opts.element);
  const isComponent = isComponentTag(tag);

  // 1. Override hit by tag.
  if (overrides[tag]) return { className: overrides[tag]!, source: 'override' };

  // 2. Token-path derivation.
  if (opts.segments) {
    const tokenPath = mostSpecificTokenPath(opts.segments, opts.tokenRoots);
    if (tokenPath && (!isComponent || tag.includes('.') || opts.tokenRoots?.has(tokenPath[0]!))) {
      const overrideKey = tokenPath.join('.');
      if (overrides[overrideKey]) return { className: overrides[overrideKey]!, source: 'override' };
      const defaultName = tokenPathToDefaultName(tokenPath, opts.tokenNamespaces);
      if (defaultName) {
        const className = transform({ source: 'token-path', tokenPath, defaultName });
        return { className, source: 'token-path' };
      }
    }
  }

  // 3. JSX component tag derivation.
  if (isComponent) {
    const defaultName = tagToDefaultName(tag);
    const className = transform({ source: 'tag', tag, defaultName });
    return { className, source: 'tag' };
  }

  if (opts.segments) {
    const literal = singleLiteralUtility(opts.segments);
    if (literal) return { className: literal, source: 'literal' };
  }

  // 5. Diagnostic — no rule matched.
  throw new DiagnosticError(
    `Cannot derive a CSS class name for <${tag}>.\n` +
      `Tag is bare HTML and the className doesn't reference a token path. ` +
      `Resolve by: (a) using a JSX component instead of <${tag}>, ` +
      `(b) extracting the classes into a single token reference, ` +
      `or (c) adding an entry to \`overrides\`.`,
    { ...diagnosticLocationFromNode(opts.element), diagnosticCode: 'tailwind-class-name' }
  );
}

function isComponentTag(tag: string): boolean {
  // Component tags start uppercase; HTML tags are lowercase.
  // For dotted tags we look at the first segment.
  const head = tag.split('.')[0]!;
  return /^[A-Z]/.test(head);
}

function tagToDefaultName(tag: string): string {
  return tag
    .split('.')
    .map((part) => kebabCase(part).replace(/^-/, ''))
    .join('-');
}

function mostSpecificTokenPath(
  segments: readonly StyleSegment[],
  tokenRoots?: ReadonlySet<string> | undefined
): readonly string[] | null {
  // Accept token segments plus any number of literal or opaque segments. Opaque
  // runtime values are preserved by the style transform, but a static token can
  // still name the generated class.
  let tokenSegment: readonly string[] | null = null;
  for (const seg of segments) {
    if (seg.kind === 'literal') continue;
    if (seg.kind === 'opaque') continue;
    if (seg.kind === 'token') {
      if (tokenRoots && !tokenRoots.has(seg.path[0]!)) continue;
      if (!tokenSegment || seg.path.length >= tokenSegment.length) tokenSegment = seg.path;
    }
  }
  return tokenSegment;
}

function tokenPathToDefaultName(
  path: readonly string[],
  tokenNamespaces?: ReadonlySet<string> | undefined
): string | null {
  const meaningful = tokenPathMeaningfulSegments(path, tokenNamespaces);
  return meaningful.map((p) => kebabCase(p).replace(/^-/, '')).join('-');
}

function tokenPathMeaningfulSegments(
  path: readonly string[],
  tokenNamespaces?: ReadonlySet<string> | undefined
): readonly string[] {
  if (path.length === 1) return path;
  if (!tokenNamespaces) return path.slice(1);
  return tokenNamespaces.has(path[0]!) ? path.slice(1) : path;
}

function singleLiteralUtility(segments: readonly StyleSegment[]): string | null {
  let utility: string | null = null;
  for (const seg of segments) {
    if (seg.kind !== 'literal') return null;
    const parts = seg.value.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (utility || !/^[a-z0-9_-]+$/.test(part)) return null;
      utility = part;
    }
  }
  return utility;
}
