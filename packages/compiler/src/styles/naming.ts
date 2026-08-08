import { kebabCase } from '@videojs/utils/string';
import { DiagnosticError, diagnosticLocationFromNode } from '../diagnostics';
import { type JsxElementLike, tagName } from '../jsx';
import type { StyleSegment } from './analyze';

/** Result of deriving a CSS class name for a JSX element. */
export interface DerivedClassName {
  /** The full class name. */
  className: string;
  /** Which derivation rule produced the name. */
  source: 'component' | 'token' | 'literal' | 'resolved';
}

export type DefaultNameSource = 'component' | 'token' | 'literal';

/** Context passed to a style name resolver. */
export interface NameContext {
  /** The default candidate source used when no name resolver is provided. */
  source: DefaultNameSource;
  /** The JSX tag (e.g. `'PlayButton'` or `'Tooltip.Trigger'`). */
  tag: string;
  /** Parsed `className` segments for the element. */
  segments: readonly StyleSegment[];
  /** Component-derived candidate, if the JSX tag is a component. */
  componentName?: string | undefined;
  /** Token-derived candidate, if `className` references a style token. */
  tokenName?: string | undefined;
  /** Literal-derived candidate, if the element has one simple literal utility. */
  literalName?: string | undefined;
  /** The token path used for `tokenName`, e.g. `['styles', 'slider', 'track']`. */
  tokenPath?: readonly string[] | undefined;
  /** The name the compiler would emit without a custom resolver. */
  defaultName: string;
}

/**
 * Hook for resolving the final class name from the available candidates.
 */
export type ResolveName = (context: NameContext) => string;

export interface DeriveClassNameOptions {
  /** The element whose class name we're deriving. */
  element: JsxElementLike;
  /**
   * Segments parsed from the element's `className` (when `kind: 'segments'`).
   * Used as a fallback when the element is bare HTML.
   */
  segments?: readonly StyleSegment[];
  /** Optional hook for resolving the final class name from naming candidates. */
  resolveName?: ResolveName | undefined;
  /**
   * Local identifiers that are namespace imports for token modules. When
   * provided, only these leading path segments are dropped from token names.
   */
  tokenNamespaces?: ReadonlySet<string>;
  /** Local identifiers known to resolve to style tokens. */
  tokenRoots?: ReadonlySet<string>;
}

/**
 * Derive a semantic CSS class name for a JSX element.
 *
 * The compiler computes component, token, and literal candidates, then calls
 * `resolveName` when provided. Without a resolver it preserves the historical
 * default: token names for bare HTML / compound components / known token roots,
 * then component names, then single literal utilities.
 */
export function deriveClassName(opts: DeriveClassNameOptions): DerivedClassName {
  const tag = tagName(opts.element);
  const isComponent = isComponentTag(tag);
  const segments = opts.segments ?? [];
  const componentName = isComponent ? tagToDefaultName(tag) : undefined;

  const tokenPath = opts.segments ? mostSpecificTokenPath(opts.segments, opts.tokenRoots) : null;
  const tokenName = tokenPath ? tokenPathToDefaultName(tokenPath, opts.tokenNamespaces) : null;
  const literalName = opts.segments ? singleLiteralUtility(opts.segments) : null;

  const tokenIsDefault = Boolean(
    tokenName && (!isComponent || tag.includes('.') || opts.tokenRoots?.has(tokenPath![0]!))
  );

  let defaultName: string | undefined;
  let defaultSource: DefaultNameSource | undefined;

  if (tokenIsDefault && tokenName) {
    defaultName = tokenName;
    defaultSource = 'token';
  } else if (componentName) {
    defaultName = componentName;
    defaultSource = 'component';
  } else if (tokenName) {
    defaultName = tokenName;
    defaultSource = 'token';
  } else if (literalName) {
    defaultName = literalName;
    defaultSource = 'literal';
  }

  if (defaultName && defaultSource) {
    const className =
      opts.resolveName?.({
        source: defaultSource,
        tag,
        segments,
        ...(componentName ? { componentName } : {}),
        ...(tokenName ? { tokenName } : {}),
        ...(literalName ? { literalName } : {}),
        ...(tokenPath ? { tokenPath } : {}),
        defaultName,
      }) ?? defaultName;
    return { className, source: opts.resolveName ? 'resolved' : defaultSource };
  }

  throw new DiagnosticError(
    `Cannot derive a CSS class name for <${tag}>.\n` +
      `Tag is bare HTML and the className doesn't reference a token path. ` +
      `Resolve by: (a) using a JSX component instead of <${tag}>, ` +
      `(b) extracting the classes into a single token reference, ` +
      `or (c) customizing the style name resolver.`,
    { ...diagnosticLocationFromNode(opts.element), diagnosticCode: 'style-class-name' }
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
