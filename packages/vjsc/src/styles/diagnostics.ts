import { type Selector, type SelectorComponent, transform } from 'lightningcss';

import type { DesignSystem } from './design-system';
import { isGroupMarker, type StyleManifest, type StyleManifestRule, utilitiesForRule } from './manifest';

const encoder = new TextEncoder();

export type ComplexSelectorDiagnosticLevel = 'warn' | 'error' | 'off';

export interface VjscDiagnosticsOptions {
  /** How suspicious structural selectors are reported. Hard isolation errors always throw. @default 'warn' */
  readonly complexSelectors?: ComplexSelectorDiagnosticLevel | undefined;
}

export type StyleDiagnosticCode =
  | 'VJSC_STYLE_PEER_RELATIONSHIP'
  | 'VJSC_STYLE_IMPLICIT_ANCESTOR'
  | 'VJSC_STYLE_UNOWNED_GROUP'
  | 'VJSC_STYLE_SCOPE_ESCAPE'
  | 'VJSC_STYLE_COMPLEX_SELECTOR';

export interface StyleDiagnostic {
  readonly code: StyleDiagnosticCode;
  readonly kind: 'error' | 'complex-selector';
  readonly rule: StyleManifestRule;
  readonly utilities: readonly string[];
}

/** Diagnose relationships and structural selectors using only the imported local manifest. */
export function diagnoseStyleManifest(
  manifest: StyleManifest,
  variants: readonly string[] = []
): readonly StyleDiagnostic[] {
  const owners = collectGroupOwners(manifest.rules, variants);
  const diagnostics: StyleDiagnostic[] = [];

  for (const rule of manifest.rules) {
    const utilities = utilitiesForRule(rule, variants);
    const peers = utilities.filter(usesPeerRelationship);
    const implicitAncestors = utilities.filter(usesImplicitAncestor);
    const unownedGroups = utilities.filter((utility) =>
      candidateVariants(utility).some((variant) => {
        const owner = groupOwnerForVariant(variant);

        return owner !== undefined && !owners.has(owner);
      })
    );
    const complex = utilities.filter(usesComplexSelector);

    if (peers.length > 0) diagnostics.push(createDiagnostic('VJSC_STYLE_PEER_RELATIONSHIP', rule, peers));

    if (implicitAncestors.length > 0) {
      diagnostics.push(createDiagnostic('VJSC_STYLE_IMPLICIT_ANCESTOR', rule, implicitAncestors));
    }

    if (unownedGroups.length > 0) {
      diagnostics.push(createDiagnostic('VJSC_STYLE_UNOWNED_GROUP', rule, unownedGroups));
    }

    if (complex.length > 0) diagnostics.push(createDiagnostic('VJSC_STYLE_COMPLEX_SELECTOR', rule, complex));
  }

  return diagnostics;
}

/** Inspect Tailwind-expanded CSS so custom utilities cannot conceal structural selectors. */
export function diagnoseCompiledCandidate(
  rule: StyleManifestRule,
  candidate: string,
  css: string,
  groupOwners: ReadonlySet<string>
): readonly StyleDiagnostic[] {
  let hasRoot = false;
  let scopeEscape = false;
  let complex = false;

  transform({
    filename: 'candidate.css',
    code: encoder.encode(css),
    visitor: {
      Rule: {
        style(styleRule) {
          for (const selector of styleRule.value.selectors) {
            if (isCandidateRoot(selector, candidate)) {
              hasRoot = true;
              continue;
            }

            if (!selector.some((component) => component.type === 'nesting')) scopeEscape = true;

            if (selectorIsComplex(selector, groupOwners)) complex = true;
          }
        },
      },
    },
  });

  const diagnostics: StyleDiagnostic[] = [];

  if (!hasRoot || scopeEscape) diagnostics.push(createDiagnostic('VJSC_STYLE_SCOPE_ESCAPE', rule, [candidate]));

  if (complex) diagnostics.push(createDiagnostic('VJSC_STYLE_COMPLEX_SELECTOR', rule, [candidate]));

  return diagnostics;
}

/** Diagnose Tailwind-expanded candidates for the semantic rules referenced by one source module. */
export function diagnoseCompiledStyles(
  manifest: StyleManifest,
  design: DesignSystem,
  ruleClassNames: ReadonlySet<string>,
  variants: readonly string[] = []
): readonly StyleDiagnostic[] {
  const groupOwners = collectGroupOwners(manifest.rules, variants);
  const diagnostics: StyleDiagnostic[] = [];

  for (const rule of manifest.rules) {
    if (!ruleClassNames.has(rule.className)) continue;

    for (const candidate of utilitiesForRule(rule, variants)) {
      if (isGroupMarker(candidate)) continue;

      const css = design.candidateCss(candidate);

      if (css) diagnostics.push(...diagnoseCompiledCandidate(rule, candidate, css, groupOwners));
    }
  }

  return diagnostics;
}

export function formatStyleDiagnostic(diagnostic: StyleDiagnostic): string {
  const context = `Style rule \`${diagnostic.rule.tokenPath.join('.')}\` in \`${diagnostic.rule.modulePath}\``;
  const utilities = diagnostic.utilities.map((utility) => `\`${utility}\``).join(', ');

  switch (diagnostic.code) {
    case 'VJSC_STYLE_PEER_RELATIONSHIP':
      return `[${diagnostic.code}] ${context} uses peer relationship utilities: ${utilities}.\nReason: Peer relationships depend on sibling ownership that an isolated module cannot discover safely.\nRecommendation: Expose an explicit component part or backdrop, or put the relevant state on the styled component.`;
    case 'VJSC_STYLE_IMPLICIT_ANCESTOR':
      return `[${diagnostic.code}] ${context} uses implicit ancestor utilities: ${utilities}.\nReason: The ancestor owner is undeclared and cannot be validated by an isolated transform.\nRecommendation: Use a locally owned named group, a component state attribute, or a CSS custom property.`;
    case 'VJSC_STYLE_UNOWNED_GROUP':
      return `[${diagnostic.code}] ${context} uses group utilities without a local owner: ${utilities}.\nReason: Resolving the relationship would require knowledge from an unrelated module.\nRecommendation: Define the named group owner beside the consumer or expose the relationship through component anatomy or state.`;
    case 'VJSC_STYLE_SCOPE_ESCAPE':
      return `[${diagnostic.code}] ${context} emits selectors outside its semantic scope from: ${utilities}.\nReason: The compiled output is no longer owned by the component rule being transformed.\nRecommendation: Move the style to the target part or add a deliberate component-level hook.`;
    case 'VJSC_STYLE_COMPLEX_SELECTOR':
      return `[${diagnostic.code}] ${context} uses structural selector utilities: ${utilities}.\nReason: Descendant, sibling, ancestor, or :has() selectors couple the rule to markup outside its own styling hook.\nRecommendation: Prefer an explicit component part, a state attribute on the styled component, or a locally owned named group.`;
  }
}

function createDiagnostic(
  code: StyleDiagnosticCode,
  rule: StyleManifestRule,
  utilities: readonly string[]
): StyleDiagnostic {
  return {
    code,
    kind: code === 'VJSC_STYLE_COMPLEX_SELECTOR' ? 'complex-selector' : 'error',
    rule,
    utilities: [...new Set(utilities)],
  };
}

function collectGroupOwners(rules: readonly StyleManifestRule[], variants: readonly string[]): ReadonlySet<string> {
  const owners = new Set<string>();

  for (const rule of rules) {
    for (const utility of utilitiesForRule(rule, variants)) {
      if (isGroupMarker(utility)) owners.add(utility);
    }
  }

  return owners;
}

function usesPeerRelationship(candidate: string): boolean {
  const { utility, variants } = splitCandidate(candidate);

  return isPeerPart(utility) || variants.some(isPeerPart);
}

function isPeerPart(value: string): boolean {
  return value === 'peer' || value.startsWith('peer/') || value.startsWith('peer-') || value.startsWith('peer[');
}

function usesImplicitAncestor(candidate: string): boolean {
  return candidateVariants(candidate).some(
    (variant) => variant === 'in' || variant.startsWith('in-') || variant.startsWith('in[')
  );
}

function usesComplexSelector(candidate: string): boolean {
  return candidateVariants(candidate).some((variant) => {
    if (variant === '*' || variant === '**') return true;

    if (variant.startsWith('has-') || variant.startsWith('group-has-')) return true;

    if (!variant.startsWith('[') || !variant.endsWith(']')) return false;

    const selector = variant.slice(1, -1);

    return selector.includes('&') && (selector.includes('_') || selector.includes(':has(') || hasCombinator(selector));
  });
}

function hasCombinator(selector: string): boolean {
  let squareDepth = 0;
  let parenthesisDepth = 0;
  let escaped = false;

  for (const character of selector) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '[') squareDepth++;
    else if (character === ']') squareDepth--;
    else if (character === '(') parenthesisDepth++;
    else if (character === ')') parenthesisDepth--;
    else if (
      squareDepth === 0 &&
      parenthesisDepth === 0 &&
      (character === '>' || character === '+' || character === '~')
    ) {
      return true;
    }
  }

  return false;
}

function groupOwnerForVariant(variant: string): string | undefined {
  if (!variant.startsWith('group-') && !variant.startsWith('group[')) return;

  const slash = lastTopLevelSlash(variant);

  return slash < 0 ? 'group' : `group/${variant.slice(slash + 1)}`;
}

function lastTopLevelSlash(value: string): number {
  let squareDepth = 0;
  let parenthesisDepth = 0;
  let escaped = false;
  let slash = -1;

  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '[') squareDepth++;
    else if (character === ']') squareDepth--;
    else if (character === '(') parenthesisDepth++;
    else if (character === ')') parenthesisDepth--;
    else if (character === '/' && squareDepth === 0 && parenthesisDepth === 0) slash = index;
  }

  return slash;
}

function candidateVariants(candidate: string): readonly string[] {
  return splitCandidate(candidate).variants;
}

function splitCandidate(candidate: string): { readonly variants: readonly string[]; readonly utility: string } {
  const parts: string[] = [];
  let start = 0;
  let squareDepth = 0;
  let parenthesisDepth = 0;
  let escaped = false;

  for (let index = 0; index < candidate.length; index++) {
    const character = candidate[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '[') squareDepth++;
    else if (character === ']') squareDepth--;
    else if (character === '(') parenthesisDepth++;
    else if (character === ')') parenthesisDepth--;
    else if (character === ':' && squareDepth === 0 && parenthesisDepth === 0) {
      parts.push(candidate.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(candidate.slice(start));
  return { variants: parts.slice(0, -1), utility: parts.at(-1) ?? '' };
}

function isCandidateRoot(selector: Selector, candidate: string): boolean {
  return selector.length === 1 && selector[0]?.type === 'class' && selector[0].name === candidate;
}

function selectorIsComplex(selector: Selector, groupOwners: ReadonlySet<string>): boolean {
  return selector.some((component) => componentIsComplex(component, groupOwners));
}

function componentIsComplex(component: SelectorComponent, groupOwners: ReadonlySet<string>): boolean {
  if (component.type === 'combinator') return true;

  if (component.type !== 'pseudo-class') return false;

  if (component.kind === 'has') return true;

  const selectors = nestedSelectors(component);
  if (selectors.length === 0) return false;

  if (selectors.some((selector) => selectorContainsGroupOwner(selector, groupOwners))) return false;

  return selectors.some((selector) => selectorIsComplex(selector, groupOwners));
}

function selectorContainsGroupOwner(selector: Selector, groupOwners: ReadonlySet<string>): boolean {
  return selector.some((component) => {
    if (component.type === 'class' && groupOwners.has(component.name)) return true;

    if (component.type !== 'pseudo-class') return false;

    return nestedSelectors(component).some((nested) => selectorContainsGroupOwner(nested, groupOwners));
  });
}

function nestedSelectors(component: Extract<SelectorComponent, { type: 'pseudo-class' }>): readonly Selector[] {
  switch (component.kind) {
    case 'not':
    case 'where':
    case 'is':
    case 'any':
    case 'has':
      return component.selectors;
    case 'nth-child':
    case 'nth-last-child':
      return component.of ?? [];
    case 'host':
      return component.selectors ? [component.selectors] : [];
    default:
      return [];
  }
}
