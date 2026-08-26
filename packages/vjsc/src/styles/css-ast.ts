import type { Rule, Selector, SelectorComponent } from 'lightningcss';

export function cloneCssAst<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Lightning CSS serializes optional AST fields as `null`, but its returned-AST deserializer accepts them only when
 * omitted.
 */
export function withoutNullValues<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNullValues) as T;

  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (record[key] === null) delete record[key];
    else record[key] = withoutNullValues(record[key]);
  }

  return value;
}

export function collectRuleClasses(rule: Rule, classes: Set<string>): Set<string> {
  visitCssRules([rule], (candidate) => {
    if (candidate.type === 'style') {
      for (const selector of candidate.value.selectors) collectSelectorClasses(selector, classes);
    } else if (candidate.type === 'nesting') {
      for (const selector of candidate.value.style.selectors) collectSelectorClasses(selector, classes);
    }
  });

  return classes;
}

export function visitCssRules(rules: readonly Rule[], visit: (rule: Rule) => void): void {
  for (const rule of rules) {
    visit(rule);

    if (rule.type === 'style') visitCssRules(rule.value.rules ?? [], visit);
    else if (rule.type === 'nesting') visitCssRules(rule.value.style.rules ?? [], visit);
    else if (hasNestedCssRules(rule)) visitCssRules(rule.value.rules, visit);
  }
}

export function hasNestedCssRules(
  rule: Rule
): rule is Extract<
  Rule,
  { type: 'media' | 'container' | 'supports' | 'layer-block' | 'moz-document' | 'scope' | 'starting-style' }
> {
  return (
    rule.type === 'media' ||
    rule.type === 'container' ||
    rule.type === 'supports' ||
    rule.type === 'layer-block' ||
    rule.type === 'moz-document' ||
    rule.type === 'scope' ||
    rule.type === 'starting-style'
  );
}

function collectSelectorClasses(selector: Selector, classes: Set<string>): void {
  for (const component of selector) {
    if (component.type === 'class') classes.add(component.name);

    for (const nested of nestedSelectors(component)) collectSelectorClasses(nested, classes);
  }
}

function nestedSelectors(component: SelectorComponent): readonly Selector[] {
  if (component.type === 'pseudo-class') {
    if (
      component.kind === 'not' ||
      component.kind === 'where' ||
      component.kind === 'is' ||
      component.kind === 'any' ||
      component.kind === 'has'
    ) {
      return component.selectors;
    }

    if (component.kind === 'host') return component.selectors ? [component.selectors] : [];

    if (component.kind === 'nth-child' || component.kind === 'nth-last-child') {
      return component.of ?? [];
    }

    if (component.kind === 'local' || component.kind === 'global') return [component.selector];
  }

  if (
    component.type === 'pseudo-element' &&
    (component.kind === 'slotted' || component.kind === 'cue-function' || component.kind === 'cue-region-function')
  ) {
    return [component.selector];
  }

  return [];
}
