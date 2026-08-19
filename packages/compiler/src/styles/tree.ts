import type { StyleRule, StyleTree } from './define';

export function isStyleRule(value: StyleRule | StyleTree): value is StyleRule {
  return 'className' in value && 'utilities' in value;
}

export function visitStyleRules(
  tree: StyleTree,
  visit: (path: readonly string[], rule: StyleRule) => void,
  path: readonly string[] = []
): void {
  for (const [name, value] of Object.entries(tree)) {
    const rulePath = [...path, name];

    if (isStyleRule(value)) visit(rulePath, value);
    else visitStyleRules(value, visit, rulePath);
  }
}
