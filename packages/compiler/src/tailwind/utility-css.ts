import type { DesignSystem } from './design-system';

/** A CSS declaration extracted from a utility. */
export interface Declaration {
  property: string;
  value: string;
}

/** Variant kinds we recognize when analyzing a utility. */
export type VariantKind =
  | 'media' // @media (...) wrapper
  | 'container' // @container (...) wrapper
  | 'supports' // @supports (...) wrapper
  | 'at-rule' // any other at-rule wrapper
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

export interface UtilityCssBranch {
  /** Declarations emitted together under this branch's variants. */
  declarations: readonly Declaration[];
  /** Variant path for these declarations. */
  variants: readonly Variant[];
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
  /** Branches emitted by this utility, preserving sibling rule/at-rule structure. */
  branches: readonly UtilityCssBranch[];
  /** Flattened declarations across every branch. */
  declarations: readonly Declaration[];
  /** Variants for the first branch, retained for simple utility inspection. */
  variants: readonly Variant[];
  /**
   * `@property` registrations Tailwind emitted for this utility. These supply
   * the typed defaults for `--tw-*` variables referenced (but not set) by the
   * declarations — see `emitCss`'s `properties` option.
   */
  properties?: readonly PropertyRule[];
}

/**
 * Analyze a Tailwind v4 utility into declarations, variant branches, and
 * registered properties.
 *
 * Tailwind v4 emits CSS in nested form: the outer rule is the utility class
 * selector, and variants appear as nested selector rules or at-rule blocks.
 * One utility can produce sibling branches (`container` emits root declarations
 * plus multiple media branches), so the branch model preserves each declaration
 * group with its own variant path.
 *
 * Returns `null` for utilities Tailwind doesn't recognize.
 */
export function analyzeUtility(utility: string, design: DesignSystem): UtilityCss | null {
  const css = design.compileUtility(utility);
  if (!css) return null;

  const trimmed = css.trim();
  const outerOpen = findBlockOpen(trimmed, 0);
  if (outerOpen === -1) return null;
  const outerBlock = readBalancedBlock(trimmed, outerOpen);
  if (!outerBlock) return null;

  const branches: UtilityCssBranch[] = [];
  walkNested(outerBlock.inner, [], branches);

  // Tailwind appends `@property --tw-* { ... }` registrations after the utility
  // rule. They live at the top level of the compiled output (siblings of the
  // utility class), so we scan the whole string rather than the rule body.
  const properties = parseProperties(trimmed);
  const declarations = branches.flatMap((branch) => branch.declarations);
  const variants = branches[0]?.variants ?? [];

  return properties.length > 0
    ? { utility, branches, declarations, variants, properties }
    : { utility, branches, declarations, variants };
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

function walkNested(body: string, variants: readonly Variant[], branches: UtilityCssBranch[]): void {
  let i = 0;
  const n = body.length;
  let declarations: Declaration[] = [];

  const flushDeclarations = (): void => {
    if (declarations.length === 0) return;
    branches.push({ declarations, variants });
    declarations = [];
  };

  while (i < n) {
    while (i < n && /[\s;]/.test(body[i]!)) i++;
    if (i >= n) break;

    if (body[i] === '@') {
      flushDeclarations();

      const headerEnd = findBlockOpen(body, i);
      if (headerEnd === -1) break;
      const header = body.slice(i, headerEnd).trim();
      const match = header.match(/^@([\w-]+)\s*([\s\S]*)$/);
      if (!match) break;
      const [, name, params] = match;
      const block = readBalancedBlock(body, headerEnd);
      if (!block) break;

      walkNested(block.inner.trim(), [...variants, atRuleVariant(name!, params!.trim())], branches);
      i = block.end + 1;
      continue;
    }

    if (body[i] === '&') {
      flushDeclarations();

      const headerEnd = findBlockOpen(body, i);
      if (headerEnd === -1) break;
      // Preserve the leading character after `&` so `& *` (descendant) doesn't
      // get folded down to bare `*` (which classifies as 'parent').
      const rawTail = body.slice(i + 1, headerEnd);
      const trimmedRight = rawTail.replace(/\s+$/, '');
      const isDescendant = /^\s/.test(rawTail);
      const selectorTail = isDescendant ? ` ${trimmedRight.trim()}` : trimmedRight.trim();
      const block = readBalancedBlock(body, headerEnd);
      if (!block) break;

      walkNested(block.inner.trim(), [...variants, classifySelectorTail(selectorTail)], branches);
      i = block.end + 1;
      continue;
    }

    const declaration = readDeclaration(body, i);
    if (!declaration) break;
    if (declaration.declaration) declarations.push(declaration.declaration);
    i = declaration.end;
  }

  flushDeclarations();
}

function atRuleVariant(name: string, params: string): Variant {
  return {
    kind:
      name === 'media' ? 'media' : name === 'container' ? 'container' : name === 'supports' ? 'supports' : 'at-rule',
    atRule: { name, params },
    raw: params ? `@${name} ${params}` : `@${name}`,
  };
}

interface ReadDeclarationResult {
  declaration?: Declaration | undefined;
  end: number;
}

function readDeclaration(body: string, start: number): ReadDeclarationResult | null {
  const n = body.length;
  let i = start;
  let colonIdx = -1;

  while (i < n) {
    const c = body[i]!;
    if (c === ':' && colonIdx === -1) {
      colonIdx = i;
      break;
    }
    if (c === ';') return { end: i + 1 };
    if (c === '{') return null;
    i++;
  }
  if (colonIdx === -1) return { end: i };

  const property = body.slice(start, colonIdx).trim();
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
    if (c === '/' && body[valueEnd + 1] === '*') {
      const end = body.indexOf('*/', valueEnd + 2);
      if (end === -1) return null;
      valueEnd = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      valueEnd++;
      continue;
    }
    if (c === '\\') {
      valueEnd += 2;
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
  const end = body[valueEnd] === ';' ? valueEnd + 1 : valueEnd;
  return property && value ? { declaration: { property, value }, end } : { end };
}

interface BalancedBlock {
  inner: string;
  end: number;
}

function findBlockOpen(body: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < body.length; i++) {
    const c = body[i]!;
    if (quote) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '{') return i;
  }
  return -1;
}

function readBalancedBlock(body: string, openIdx: number): BalancedBlock | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIdx; i < body.length; i++) {
    const c = body[i]!;
    if (quote) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
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
