import type { Rule, Selector, SelectorComponent } from 'lightningcss';

export function cloneCssAst<T>(value: T): T {
  return structuredClone(value);
}

/** Lightning CSS serializes optional AST fields as `null`, but its returned-AST
 * deserializer accepts them only when omitted. */
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
  visitRuleSelectors(rule, (selector) => collectSelectorClasses(selector, classes));
  return classes;
}

function visitRuleSelectors(rule: Rule, visit: (selector: Selector) => void): void {
  switch (rule.type) {
    case 'style':
      for (const selector of rule.value.selectors) visit(selector);
      for (const child of rule.value.rules ?? []) visitRuleSelectors(child, visit);
      return;
    case 'nesting':
      for (const selector of rule.value.style.selectors) visit(selector);
      for (const child of rule.value.style.rules ?? []) visitRuleSelectors(child, visit);
      return;
    case 'media':
    case 'container':
    case 'supports':
    case 'layer-block':
    case 'moz-document':
    case 'scope':
    case 'starting-style':
      for (const child of rule.value.rules) visitRuleSelectors(child, visit);
      return;
    default:
      return;
  }
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
