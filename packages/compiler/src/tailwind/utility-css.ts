import {
  type DeclarationBlock as CssDeclarationBlock,
  type Location2 as CssLocation,
  type PropertyRule as CssPropertyRule,
  type Rule as CssRule,
  type Selector as CssSelector,
  type SelectorList as CssSelectorList,
  type StyleRule as CssStyleRule,
  type StyleSheet as CssStyleSheet,
  transform,
} from 'lightningcss';
import type { DesignSystem } from './design-system';

const encoder = new TextEncoder();

type AtRuleCssRule = Extract<
  CssRule,
  { type: 'media' | 'container' | 'supports' | 'layer-block' | 'moz-document' | 'scope' | 'starting-style' }
>;

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
  /** Lightning CSS selector AST for this variant, if any. */
  selectorAst?: CssSelectorList;
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
   * declarations — see the Tailwind CSS renderer's `properties` option.
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

  const stylesheet = parseStyleSheet(css);
  if (!stylesheet) return null;

  const context = createAnalysisContext(css);

  const branches: UtilityCssBranch[] = [];
  collectRuleBranches(stylesheet.rules, [], branches, context);

  // Tailwind appends `@property --tw-* { ... }` registrations after the utility rule.
  const properties = collectProperties(stylesheet.rules, context);
  const declarations = branches.flatMap((branch) => branch.declarations);
  const variants = branches[0]?.variants ?? [];

  return properties.length > 0
    ? { utility, branches, declarations, variants, properties }
    : { utility, branches, declarations, variants };
}

function parseStyleSheet(css: string): CssStyleSheet | null {
  let stylesheet: CssStyleSheet | undefined;

  try {
    transform({
      filename: 'tailwind-utility.css',
      code: encoder.encode(css),
      visitor: {
        StyleSheet(sheet) {
          stylesheet = sheet;
        },
      },
    });
  } catch {
    return null;
  }

  return stylesheet ?? null;
}

interface AnalysisContext {
  css: string;
  lineStarts: readonly number[];
}

function createAnalysisContext(css: string): AnalysisContext {
  const lineStarts = [0];
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '\n') lineStarts.push(i + 1);
  }
  return { css, lineStarts };
}

function collectRuleBranches(
  rules: readonly CssRule[],
  variants: readonly Variant[],
  branches: UtilityCssBranch[],
  context: AnalysisContext
): void {
  for (const rule of rules) collectRuleBranch(rule, variants, branches, context);
}

function collectRuleBranch(
  rule: CssRule,
  variants: readonly Variant[],
  branches: UtilityCssBranch[],
  context: AnalysisContext
): void {
  switch (rule.type) {
    case 'style':
      collectStyleRuleBranches(rule.value, variants, branches, context);
      return;
    case 'nesting': {
      const variant = selectorVariantFromStyleRule(rule.value.style, context);
      collectStyleRuleBranches(rule.value.style, [...variants, variant], branches, context);
      return;
    }
    case 'nested-declarations':
      pushNestedDeclarationBranch(rule.value.declarations, rule.value.loc, variants, branches, context);
      return;
    case 'media':
    case 'container':
    case 'supports':
    case 'layer-block':
    case 'moz-document':
    case 'scope':
    case 'starting-style':
      collectRuleBranches(rule.value.rules, [...variants, atRuleVariantFromRule(rule, context)], branches, context);
      return;
    default:
      return;
  }
}

function collectStyleRuleBranches(
  rule: CssStyleRule,
  variants: readonly Variant[],
  branches: UtilityCssBranch[],
  context: AnalysisContext
): void {
  if (rule.declarations) pushDeclarationBranch(rule.declarations, rule.loc, variants, branches, context);

  for (const nestedRule of rule.rules ?? []) {
    if (nestedRule.type === 'style') {
      const variant = selectorVariantFromStyleRule(nestedRule.value, context);
      collectStyleRuleBranches(nestedRule.value, [...variants, variant], branches, context);
      continue;
    }
    collectRuleBranch(nestedRule, variants, branches, context);
  }
}

function pushDeclarationBranch(
  block: CssDeclarationBlock,
  loc: CssLocation,
  variants: readonly Variant[],
  branches: UtilityCssBranch[],
  context: AnalysisContext
): void {
  const declarations = declarationsForBlock(block, loc, context);
  if (declarations.length === 0) return;
  branches.push({ declarations, variants });
}

function pushNestedDeclarationBranch(
  block: CssDeclarationBlock,
  loc: CssLocation,
  variants: readonly Variant[],
  branches: UtilityCssBranch[],
  context: AnalysisContext
): void {
  const declarations = declarationsFromIndex(block, indexFromLocation(context, loc), context);
  if (declarations.length === 0) return;
  branches.push({ declarations, variants });
}

function atRuleVariantFromRule(rule: AtRuleCssRule, context: AnalysisContext): Variant {
  const header = ruleHeader(rule, context);
  const name = atRuleName(rule);
  const params = atRuleParams(header);

  return {
    kind: atRuleKind(rule),
    atRule: { name, params },
    raw: params ? `@${name} ${params}` : `@${name}`,
  };
}

function atRuleKind(rule: AtRuleCssRule): VariantKind {
  switch (rule.type) {
    case 'media':
    case 'container':
    case 'supports':
      return rule.type;
    default:
      return 'at-rule';
  }
}

function atRuleName(rule: AtRuleCssRule): string {
  switch (rule.type) {
    case 'media':
    case 'container':
    case 'supports':
    case 'scope':
    case 'starting-style':
      return rule.type;
    case 'layer-block':
      return 'layer';
    case 'moz-document':
      return '-moz-document';
  }
}

function atRuleParams(header: string): string {
  const trimmed = header.trim();
  if (!trimmed.startsWith('@')) return '';

  let i = 1;
  while (i < trimmed.length && !/\s/.test(trimmed[i]!)) i++;
  return trimmed.slice(i).trim();
}

function selectorTailFromStyleRule(rule: CssStyleRule, context: AnalysisContext): string {
  const header = ruleHeader({ type: 'style', value: rule }, context);
  if (!header.startsWith('&')) return header;

  // Preserve the leading character after `&` so `& *` (descendant) doesn't get
  // folded down to bare `*` (which classifies as 'parent').
  const rawTail = header.slice(1);
  const trimmedRight = rawTail.replace(/\s+$/, '');
  return /^\s/.test(rawTail) ? ` ${trimmedRight.trim()}` : trimmedRight.trim();
}

function selectorVariantFromStyleRule(rule: CssStyleRule, context: AnalysisContext): Variant {
  const tail = selectorTailFromStyleRule(rule, context);
  return classifySelector(rule.selectors, tail, rule.selectors);
}

function collectProperties(rules: readonly CssRule[], context: AnalysisContext): PropertyRule[] {
  const properties: PropertyRule[] = [];
  for (const rule of rules) collectPropertyRule(rule, properties, context);
  return properties;
}

function collectPropertyRule(rule: CssRule, properties: PropertyRule[], context: AnalysisContext): void {
  switch (rule.type) {
    case 'property':
      properties.push(propertyRuleFromAst(rule.value, context));
      return;
    case 'media':
    case 'container':
    case 'supports':
    case 'layer-block':
    case 'moz-document':
    case 'scope':
    case 'starting-style':
      for (const child of rule.value.rules) collectPropertyRule(child, properties, context);
      return;
    default:
      return;
  }
}

function propertyRuleFromAst(rule: CssPropertyRule, context: AnalysisContext): PropertyRule {
  // Use Lightning's AST for rule identity, but source text for descriptors so
  // emitted CSS preserves Tailwind's authored values instead of serializer output.
  const descriptors = propertyDescriptorsFromSource(rule, context);
  return {
    name: rule.name,
    ...(descriptors.syntax ? { syntax: descriptors.syntax } : {}),
    inherits: rule.inherits,
    ...(descriptors.initialValue ? { initialValue: descriptors.initialValue } : {}),
  };
}

function propertyDescriptorsFromSource(
  rule: CssPropertyRule,
  context: AnalysisContext
): { syntax?: string; initialValue?: string } {
  const open = findBlockOpen(context.css, indexFromLocation(context, rule.loc));
  if (open === -1) return {};

  const block = readBalancedBlock(context.css, open);
  if (!block) return {};

  const descriptors: { syntax?: string; initialValue?: string } = {};
  for (const declaration of parseLocalDeclarations(block.inner)) {
    if (declaration.property === 'syntax') descriptors.syntax = declaration.value;
    else if (declaration.property === 'initial-value') descriptors.initialValue = declaration.value;
  }
  return descriptors;
}

function declarationsForBlock(block: CssDeclarationBlock, loc: CssLocation, context: AnalysisContext): Declaration[] {
  const declaredCount = (block.declarations?.length ?? 0) + (block.importantDeclarations?.length ?? 0);
  if (declaredCount === 0) return [];

  const open = findBlockOpen(context.css, indexFromLocation(context, loc));
  if (open === -1) return [];
  const sourceBlock = readBalancedBlock(context.css, open);
  if (!sourceBlock) return [];

  return parseLocalDeclarations(sourceBlock.inner).slice(0, declaredCount);
}

function declarationsFromIndex(block: CssDeclarationBlock, start: number, context: AnalysisContext): Declaration[] {
  const declaredCount = (block.declarations?.length ?? 0) + (block.importantDeclarations?.length ?? 0);
  if (declaredCount === 0) return [];
  return parseLocalDeclarations(context.css.slice(start)).slice(0, declaredCount);
}

function ruleHeader(rule: CssRule, context: AnalysisContext): string {
  const loc = ruleLocation(rule);
  const start = indexFromLocation(context, loc);
  const open = findBlockOpen(context.css, start);
  return open === -1 ? context.css.slice(start).trim() : context.css.slice(start, open).trim();
}

function ruleLocation(rule: CssRule): CssLocation {
  switch (rule.type) {
    case 'media':
    case 'style':
    case 'supports':
    case 'moz-document':
    case 'layer-block':
    case 'container':
    case 'scope':
    case 'starting-style':
      return rule.value.loc;
    default:
      return { source_index: 0, line: 0, column: 1 };
  }
}

function indexFromLocation(context: AnalysisContext, loc: CssLocation): number {
  const lineStart = context.lineStarts[loc.line] ?? 0;
  return lineStart + Math.max(0, loc.column - 1);
}

function parseLocalDeclarations(body: string): Declaration[] {
  const declarations: Declaration[] = [];
  let i = 0;

  while (i < body.length) {
    while (i < body.length && /[\s;]/.test(body[i]!)) i++;
    if (i >= body.length) break;

    if (body[i] === '@' || body[i] === '&') {
      const next = skipNestedBlock(body, i);
      if (next === -1) break;
      i = next;
      continue;
    }

    const declaration = readDeclaration(body, i);
    if (!declaration) {
      const next = skipNestedBlock(body, i);
      if (next === -1) break;
      i = next;
      continue;
    }
    if (declaration.declaration) declarations.push(declaration.declaration);
    i = declaration.end;
  }
  return declarations;
}

function skipNestedBlock(body: string, start: number): number {
  const open = findBlockOpen(body, start);
  if (open === -1) return -1;
  const block = readBalancedBlock(body, open);
  return block ? block.end + 1 : -1;
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

function classifySelector(selectors: CssSelectorList, tail: string, selectorAst: CssSelectorList): Variant {
  const components = selectorTailComponents(selectors[0] ?? []);

  if (selectorContainsClass(components, 'group')) return { kind: 'group', selector: tail, selectorAst, raw: tail };
  if (selectorContainsClass(components, 'peer')) return { kind: 'peer', selector: tail, selectorAst, raw: tail };
  if (selectorContainsComponent(components, (component) => component.type === 'attribute')) {
    return { kind: 'attribute', selector: tail, selectorAst, raw: tail };
  }
  if (selectorContainsComponent(components, (component) => component.type === 'combinator')) {
    return { kind: 'descendant', selector: tail, selectorAst, raw: tail };
  }
  if (
    selectorContainsComponent(
      components,
      (component) => component.type === 'pseudo-class' || component.type === 'pseudo-element'
    )
  ) {
    return { kind: 'pseudo', selector: tail, selectorAst, raw: tail };
  }
  return { kind: 'parent', selector: tail, selectorAst, raw: tail };
}

function selectorTailComponents(selector: CssSelector): CssSelector {
  return selector[0]?.type === 'nesting' ? selector.slice(1) : selector;
}

function selectorContainsClass(selector: CssSelector, className: string): boolean {
  return selectorContainsComponent(
    selector,
    (component) => component.type === 'class' && classNameMatches(component.name, className)
  );
}

function selectorContainsComponent(
  selector: CssSelector,
  predicate: (component: CssSelector[number]) => boolean
): boolean {
  for (const component of selector) {
    if (predicate(component)) return true;
    for (const nested of selectorLists(component)) {
      if (selectorContainsComponent(nested, predicate)) return true;
    }
  }
  return false;
}

function classNameMatches(actual: string, expected: string): boolean {
  return actual === expected || actual.startsWith(`${expected}/`) || actual.startsWith(`${expected}\\/`);
}

function selectorLists(component: CssSelector[number]): readonly CssSelector[] {
  if (!('selectors' in component) || !component.selectors) return [];
  const selectors = component.selectors;
  return Array.isArray(selectors[0]) ? (selectors as CssSelector[]) : [selectors as CssSelector];
}
