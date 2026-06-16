import { kebabCase } from '@videojs/utils/string';
import type ts from 'typescript';
import type { JsxElementLike } from '../matchers';
import { tagName } from '../matchers';
import type { StyleSegment } from '../styles';

/** Result of deriving a CSS class name for a JSX element. */
export interface DerivedClassName {
  /** The full class name. */
  className: string;
  /** Which derivation rule produced the name. */
  source: 'tag' | 'token-path' | 'override';
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
}

/**
 * Diagnostic thrown when no rule matches — typically a bare HTML element
 * with arbitrary class strings and no token-path indication of intent.
 * Resolution is up to the consumer (move classes onto a component,
 * extract a token, add an override).
 */
export class DiagnosticError extends Error {
  constructor(
    message: string,
    /** Source file the offending element lives in (best-effort). */
    public readonly fileName?: string,
    /** Line number (1-based, best-effort). */
    public readonly line?: number
  ) {
    super(message);
    this.name = 'DiagnosticError';
  }
}

/**
 * Derive a semantic CSS class name for a JSX element.
 *
 * Priority order:
 *   1. **Override** — `overrides[tag]` or `overrides[token-path]` if set.
 *   2. **JSX component tag** — kebab-cased, dotted parts joined with `-`.
 *      Result passed through `transformName` for final shaping.
 *   3. **Token path** — for bare HTML elements with a single dotted token
 *      reference. Leading namespace identifier is dropped; remaining parts
 *      kebab-cased and joined with `-`. Result passed through `transformName`.
 *   4. **Diagnostic** — no rule matched; throws `DiagnosticError`.
 */
export function deriveClassName(opts: DeriveClassNameOptions): DerivedClassName {
  const overrides = opts.overrides ?? {};
  const transform: NameTransform = opts.transformName ?? ((ctx) => ctx.defaultName);

  const tag = tagName(opts.element);

  // 1. Override hit by tag.
  if (overrides[tag]) return { className: overrides[tag]!, source: 'override' };

  // 2. JSX component tag derivation.
  if (isComponentTag(tag)) {
    const defaultName = tagToDefaultName(tag);
    const className = transform({ source: 'tag', tag, defaultName });
    return { className, source: 'tag' };
  }

  // 3. Token-path derivation.
  if (opts.segments) {
    const tokenPath = singleTokenPath(opts.segments);
    if (tokenPath) {
      const overrideKey = tokenPath.join('.');
      if (overrides[overrideKey]) return { className: overrides[overrideKey]!, source: 'override' };
      const defaultName = tokenPathToDefaultName(tokenPath);
      if (defaultName) {
        const className = transform({ source: 'token-path', tokenPath, defaultName });
        return { className, source: 'token-path' };
      }
    }
  }

  // 4. Diagnostic — no rule matched.
  const loc = sourceLocation(opts.element);
  throw new DiagnosticError(
    `Cannot derive a CSS class name for <${tag}>${loc ? ` at ${loc.fileName}:${loc.line}` : ''}.\n` +
      `Tag is bare HTML and the className doesn't reference a single token. ` +
      `Resolve by: (a) using a JSX component instead of <${tag}>, ` +
      `(b) extracting the classes into a single token reference, ` +
      `or (c) adding an entry to \`overrides\`.`,
    loc?.fileName,
    loc?.line
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

function singleTokenPath(segments: readonly StyleSegment[]): readonly string[] | null {
  // Accept a single token segment plus any number of literal segments
  // (literals contribute utilities, the token names the class). Reject
  // multiple token segments (ambiguous) or any opaque expression.
  let tokenSegment: readonly string[] | null = null;
  for (const seg of segments) {
    if (seg.kind === 'literal') continue;
    if (seg.kind === 'opaque') return null;
    if (seg.kind === 'token') {
      if (tokenSegment) return null;
      tokenSegment = seg.path;
    }
  }
  return tokenSegment;
}

function tokenPathToDefaultName(path: readonly string[]): string | null {
  // Drop the leading identifier (the namespace under which the tokens are
  // imported) — it's not semantic.
  if (path.length < 2) return null;
  const meaningful = path.slice(1);
  return meaningful.map((p) => kebabCase(p).replace(/^-/, '')).join('-');
}

function sourceLocation(node: ts.Node): { fileName: string; line: number } | null {
  const sourceFile = node.getSourceFile?.();
  if (!sourceFile) return null;
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
  return { fileName: sourceFile.fileName, line: line + 1 };
}
