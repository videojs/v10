import type { DesignSystem } from './design-system';

/** A CSS declaration extracted from a utility. */
export interface Declaration {
  property: string;
  value: string;
}

/** Variant kinds we recognize when decomposing a utility. */
export type VariantKind =
  | 'media' // @media (...) wrapper
  | 'container' // @container (...) wrapper
  | 'supports' // @supports (...) wrapper
  | 'pseudo' // selector tail like `:hover`, `::before`, `:focus-visible`
  | 'attribute' // `[data-x]`, `[data-x=y]`
  | 'group' // `:is(:where(.group)... *)` (Tailwind v4 group-* variant)
  | 'peer' // `:is(:where(.peer)... ~ *)` (Tailwind v4 peer-* variant)
  | 'descendant' // `& > *`, `& *`, etc.
  | 'parent'; // anything else

export interface Variant {
  kind: VariantKind;
  /** Selector segment this variant adds, if any. */
  selector?: string;
  /** At-rule wrapper, if any. */
  atRule?: { name: string; params: string };
  /** Original raw form (for diagnostics + emit). */
  raw: string;
}

/**
 * A `@property` registration Tailwind appends alongside a utility (e.g.
 * `@property --tw-content { syntax: "*"; inherits: false; initial-value: "" }`).
 * Values are kept verbatim so they can be re-emitted or inlined as authored.
 */
export interface PropertyRule {
  name: string;
  syntax?: string;
  inherits?: boolean;
  initialValue?: string;
}

export interface UtilityCss {
  utility: string;
  declarations: readonly Declaration[];
  variants: readonly Variant[];
  /**
   * `@property` registrations Tailwind emitted for this utility. These supply
   * the typed defaults for `--tw-*` variables referenced (but not set) by the
   * declarations — see `emitCss`'s `properties` option.
   */
  properties?: readonly PropertyRule[];
}

/**
 * Decompose a Tailwind v4 utility into its declarations + variant chain.
 *
 * Tailwind v4 emits CSS in nested form: the outer rule is the utility class
 * selector, and any variants are nested inside using `&:hover`, `@media (...)`,
 * `&[data-x]`, etc. Multiple variants on a single utility produce multiply
 * nested blocks. We walk the nesting tree, collecting one `Variant` per
 * nesting level (outermost → innermost), and read the innermost declarations.
 *
 * Returns `null` for utilities Tailwind doesn't recognize.
 */
export function decompose(utility: string, design: DesignSystem): UtilityCss | null {
  const css = design.compileUtility(utility);
  if (!css) return null;

  const trimmed = css.trim();
  const outerOpen = trimmed.indexOf('{');
  if (outerOpen === -1) return null;
  const outerBlock = readBalancedBlock(trimmed, outerOpen);
  if (!outerBlock) return null;

  // The outer selector is the escaped utility class. We walk the body to
  // collect variants from each nesting level + the innermost declarations.
  const body = outerBlock.inner;

  const variants: Variant[] = [];
  const declarations: Declaration[] = [];
  walkNested(body, variants, declarations);

  // Tailwind appends `@property --tw-* { ... }` registrations after the utility
  // rule. They live at the top level of the compiled output (siblings of the
  // utility class), so we scan the whole string rather than the rule body.
  const properties = parseProperties(trimmed);

  return properties.length > 0 ? { utility, declarations, variants, properties } : { utility, declarations, variants };
}

/** Parse every `@property --name { ... }` block from a compiled utility. */
function parseProperties(css: string): PropertyRule[] {
  const out: PropertyRule[] = [];
  const re = /@property\s+(--[A-Za-z0-9_-]+)\s*\{/g;
  let match = re.exec(css);
  while (match !== null) {
    const name = match[1]!;
    const openIdx = match.index + match[0].length - 1;
    const block = readBalancedBlock(css, openIdx);
    if (!block) break;

    const rule: PropertyRule = { name };
    for (const decl of block.inner.split(';')) {
      const colon = decl.indexOf(':');
      if (colon === -1) continue;
      const prop = decl.slice(0, colon).trim();
      const value = decl.slice(colon + 1).trim();
      if (!value) continue;
      if (prop === 'syntax') rule.syntax = value;
      else if (prop === 'inherits') rule.inherits = value === 'true';
      else if (prop === 'initial-value') rule.initialValue = value;
    }
    out.push(rule);
    re.lastIndex = block.end + 1;
    match = re.exec(css);
  }
  return out;
}

/**
 * Walk a CSS body collecting declarations directly at this level and
 * recursing into nested at-rules / `&`-prefixed selector rules. Each
 * recursion level pushes one `Variant` describing the nesting it represents.
 *
 *   - Pure declarations (`prop: value;`) at the current level go into `declarations`.
 *   - Nested `&<selector> { ... }` blocks add a selector variant and recurse.
 *   - Nested `@media (...) { ... }`, `@container (...)`, `@supports (...)` add
 *     the corresponding at-rule variant and recurse.
 */
function walkNested(body: string, variants: Variant[], declarations: Declaration[]): void {
  let i = 0;
  const n = body.length;

  while (i < n) {
    while (i < n && /[\s;]/.test(body[i]!)) i++;
    if (i >= n) break;

    if (body[i] === '@') {
      const headerEnd = body.indexOf('{', i);
      if (headerEnd === -1) break;
      const header = body.slice(i, headerEnd).trim();
      const m = header.match(/^@([\w-]+)\s*([\s\S]*)$/);
      if (!m) break;
      const [, name, params] = m;
      const block = readBalancedBlock(body, headerEnd);
      if (!block) break;

      variants.push({
        kind: name === 'media' ? 'media' : name === 'container' ? 'container' : 'supports',
        atRule: { name: name!, params: params!.trim() },
        raw: `@${name} ${params}`,
      });
      walkNested(block.inner.trim(), variants, declarations);
      i = block.end + 1;
      continue;
    }

    if (body[i] === '&') {
      const headerEnd = body.indexOf('{', i);
      if (headerEnd === -1) break;
      // Preserve the leading character after `&` so `& *` (descendant) doesn't
      // get folded down to bare `*` (which classifies as 'parent').
      const rawTail = body.slice(i + 1, headerEnd);
      const trimmedRight = rawTail.replace(/\s+$/, '');
      const isDescendant = /^\s/.test(rawTail);
      const selectorTail = isDescendant ? ` ${trimmedRight.trim()}` : trimmedRight.trim();
      const block = readBalancedBlock(body, headerEnd);
      if (!block) break;

      variants.push(classifySelectorTail(selectorTail));
      walkNested(block.inner.trim(), variants, declarations);
      i = block.end + 1;
      continue;
    }

    // Plain declaration `prop: value;` — read with bracket-balance awareness
    // so `var()`, `calc()`, `oklch(from var(--x) ...)` survive intact.
    const propStart = i;
    let colonIdx = -1;
    while (i < n && body[i] !== ';' && body[i] !== '{') {
      if (body[i] === ':' && colonIdx === -1) colonIdx = i;
      i++;
    }
    if (body[i] === '{') break;
    if (colonIdx === -1) {
      if (body[i] === ';') i++;
      continue;
    }

    const property = body.slice(propStart, colonIdx).trim();
    let valueEnd = colonIdx + 1;
    let depth = 0;
    let quote: string | null = null;
    while (valueEnd < n) {
      const c = body[valueEnd]!;
      if (quote) {
        if (c === '\\') {
          valueEnd += 2;
          continue;
        }
        if (c === quote) quote = null;
        valueEnd++;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        valueEnd++;
        continue;
      }
      if (c === '(' || c === '{' || c === '[') {
        depth++;
        valueEnd++;
        continue;
      }
      if (c === ')' || c === '}' || c === ']') {
        depth--;
        valueEnd++;
        continue;
      }
      if (c === ';' && depth === 0) break;
      valueEnd++;
    }
    const value = body.slice(colonIdx + 1, valueEnd).trim();
    if (property && value) declarations.push({ property, value });
    i = valueEnd;
    if (body[i] === ';') i++;
  }
}

interface BalancedBlock {
  inner: string;
  end: number;
}

function readBalancedBlock(body: string, openIdx: number): BalancedBlock | null {
  let depth = 0;
  for (let i = openIdx; i < body.length; i++) {
    const c = body[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { inner: body.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

function classifySelectorTail(tail: string): Variant {
  if (/^:is\(:where\(\.group/.test(tail)) return { kind: 'group', selector: tail, raw: tail };
  if (/^:is\(:where\(\.peer/.test(tail)) return { kind: 'peer', selector: tail, raw: tail };
  if (tail.startsWith('[')) return { kind: 'attribute', selector: tail, raw: tail };
  if (tail.startsWith(':')) return { kind: 'pseudo', selector: tail, raw: tail };
  if (tail.startsWith('>') || tail.startsWith('+') || tail.startsWith('~') || tail.startsWith(' ')) {
    return { kind: 'descendant', selector: tail, raw: tail };
  }
  return { kind: 'parent', selector: tail, raw: tail };
}
