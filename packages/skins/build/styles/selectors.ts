import type { Rule, Selector, SelectorComponent, SelectorList } from 'lightningcss';
import { cloneCssAst } from './css-ast';

function cloneSelectorList(selectors: SelectorList): SelectorList {
  return selectors.map(cloneSelector);
}

export function replaceSelectorClasses(
  selectors: SelectorList,
  replacements: ReadonlyMap<string, string>
): SelectorList {
  if (replacements.size === 0) return cloneSelectorList(selectors);

  return mapSelectorList(selectors, (component) => {
    if (component.type !== 'class') return component;
    const replacement = replacements.get(component.name);
    return replacement ? { ...component, name: replacement } : component;
  });
}

export function replaceRuleClasses(rule: Rule, replacements: ReadonlyMap<string, string>): Rule {
  const clone = cloneCssAst(rule);
  replaceRuleClassesInPlace(clone, replacements);
  return clone;
}

function replaceRuleClassesInPlace(rule: Rule, replacements: ReadonlyMap<string, string>): void {
  switch (rule.type) {
    case 'style':
      rule.value.selectors = replaceSelectorClasses(rule.value.selectors, replacements);
      for (const child of rule.value.rules ?? []) replaceRuleClassesInPlace(child, replacements);
      return;
    case 'nesting':
      rule.value.style.selectors = replaceSelectorClasses(rule.value.style.selectors, replacements);
      for (const child of rule.value.style.rules ?? []) replaceRuleClassesInPlace(child, replacements);
      return;
    case 'media':
    case 'container':
    case 'supports':
    case 'layer-block':
    case 'moz-document':
    case 'scope':
    case 'starting-style':
      for (const child of rule.value.rules) replaceRuleClassesInPlace(child, replacements);
      return;
    default:
      return;
  }
}

/** Render Tailwind group descendants in the component-oriented form a person
 * would normally author, while retaining Tailwind's zero-specificity owner. */
export function foldGroupDescendantSelectors(selectors: SelectorList): SelectorList {
  return selectors.map((selector) => {
    const relationships = selector.flatMap((component) => {
      const relationship = groupDescendantRelationship(component);
      return relationship ? [relationship] : [];
    });
    if (relationships.length === 0) return cloneSelector(selector);

    const owner = JSON.stringify(relationships[0]?.owner);
    if (relationships.some((relationship) => JSON.stringify(relationship.owner) !== owner)) {
      return cloneSelector(selector);
    }

    const relationshipComponents = new Set(relationships.map((relationship) => relationship.component));
    const subject = selector.filter((component) => !relationshipComponents.has(component)).map(cloneSelectorComponent);
    return [
      cloneSelectorComponent(relationships[0]!.owner),
      ...relationships.flatMap((relationship) => relationship.conditions.map(cloneSelectorComponent)),
      { type: 'combinator', value: 'descendant' },
      ...subject,
    ];
  });
}

interface GroupDescendantRelationship {
  component: SelectorComponent;
  owner: SelectorComponent;
  conditions: readonly SelectorComponent[];
}

function groupDescendantRelationship(component: SelectorComponent): GroupDescendantRelationship | undefined {
  if (component.type !== 'pseudo-class' || component.kind !== 'is' || component.selectors.length !== 1) return;
  const selector = component.selectors[0]!;
  if (selector.length < 3) return;
  const owner = selector[0];
  const combinator = selector.at(-2);
  const target = selector.at(-1);
  if (
    owner?.type !== 'pseudo-class' ||
    owner.kind !== 'where' ||
    owner.selectors.length !== 1 ||
    owner.selectors[0]?.length !== 1 ||
    owner.selectors[0][0]?.type !== 'class' ||
    combinator?.type !== 'combinator' ||
    combinator.value !== 'descendant' ||
    target?.type !== 'universal'
  ) {
    return;
  }
  const conditions = selector.slice(1, -2);
  if (conditions.some((condition) => condition.type === 'combinator' || condition.type === 'nesting')) return;
  return { component, owner, conditions };
}

function cloneSelector(selector: Selector): Selector {
  return selector.map(cloneSelectorComponent);
}

function cloneSelectorComponent(component: SelectorComponent): SelectorComponent {
  return cloneCssAst(component);
}

function mapSelectorList(
  selectors: SelectorList,
  map: (component: SelectorComponent) => SelectorComponent
): SelectorList {
  return selectors.map((selector) => selector.map((component) => mapNestedSelectorComponent(map(component), map)));
}

function mapNestedSelectorComponent(
  component: SelectorComponent,
  map: (component: SelectorComponent) => SelectorComponent
): SelectorComponent {
  if (component.type === 'pseudo-class') {
    if (
      component.kind === 'not' ||
      component.kind === 'where' ||
      component.kind === 'is' ||
      component.kind === 'any' ||
      component.kind === 'has'
    ) {
      return {
        ...component,
        selectors: mapNestedSelectorList(component.selectors, map),
      };
    }
    if (component.kind === 'host') {
      if (!component.selectors) return component;
      return {
        ...component,
        selectors: mapNestedSelector(component.selectors, map),
      };
    }
    if (component.kind === 'nth-child' || component.kind === 'nth-last-child') {
      if (!component.of) return component;
      return {
        ...component,
        of: mapNestedSelectorList(component.of, map),
      };
    }
    if (component.kind === 'local' || component.kind === 'global') {
      return {
        ...component,
        selector: mapNestedSelector(component.selector, map),
      };
    }
  }

  if (
    component.type === 'pseudo-element' &&
    (component.kind === 'slotted' || component.kind === 'cue-function' || component.kind === 'cue-region-function')
  ) {
    return {
      ...component,
      selector: mapNestedSelector(component.selector, map),
    };
  }

  return component;
}

function mapNestedSelector(selector: Selector, map: (component: SelectorComponent) => SelectorComponent): Selector {
  return selector.map((child) => mapNestedSelectorComponent(map(child), map));
}

function mapNestedSelectorList(
  selectors: SelectorList,
  map: (component: SelectorComponent) => SelectorComponent
): SelectorList {
  return selectors.map((selector) => mapNestedSelector(selector, map));
}
