import { type Selector, type SelectorComponent, type SelectorList, transform } from 'lightningcss';
import type { NameContext, StyleSegment } from '../styles';
import type { Declaration, Variant } from './utility-css';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type { Selector, SelectorComponent, SelectorList } from 'lightningcss';

export interface ResolveElementResult {
  className: string;
  chunk?: string | undefined;
}

export interface ResolveElementContext extends NameContext {}

export interface ResolveRuleContext {
  selector: SelectorList;
  baseSelector: SelectorList;
  className: string;
  utility: string;
  declarations: readonly Declaration[];
  variants: readonly Variant[];
  atRules: readonly string[];
  segments: readonly StyleSegment[];
  chunk?: string | undefined;
}

export interface ResolveClassListContext {
  classes: readonly string[];
  className: string;
  segments: readonly StyleSegment[];
}

export type ResolveElement = (context: ResolveElementContext) => ResolveElementResult | string | null | undefined;
export type ResolveRule = (context: ResolveRuleContext) => SelectorList | null | undefined;
export type ResolveClassList = (context: ResolveClassListContext) => readonly string[] | null | undefined;

export function normalizeResolveElementResult(
  resolution: ResolveElementResult | string | null | undefined
): ResolveElementResult | undefined {
  if (resolution == null) return undefined;
  return typeof resolution === 'string' ? { className: resolution } : resolution;
}

export function selectorListForClass(className: string): SelectorList {
  return [[{ type: 'class', name: className }]];
}

export function composeSelectorLists(base: SelectorList, variant: SelectorList | undefined): SelectorList {
  if (!variant) return cloneSelectorList(base);

  const out: SelectorList = [];

  for (const variantSelector of variant) {
    if (hasNesting(variantSelector)) {
      for (const baseSelector of base) {
        out.push(replaceNesting(variantSelector, baseSelector));
      }
      continue;
    }

    for (const baseSelector of base) {
      out.push([...cloneSelector(baseSelector), ...cloneSelector(variantSelector)]);
    }
  }

  return out;
}

export function serializeSelectorList(selectors: SelectorList): string {
  const result = transform({
    filename: 'selector.css',
    code: encoder.encode('.x { color: red; }'),
    visitor: {
      Rule: {
        style(rule) {
          return { ...rule, value: { ...rule.value, selectors } };
        },
      },
    },
  });

  const css = decoder.decode(result.code).trim();
  const open = css.indexOf('{');

  return open === -1 ? css : css.slice(0, open).trim();
}

export function cloneSelectorList(selectors: SelectorList): SelectorList {
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

function cloneSelector(selector: Selector): Selector {
  return selector.map(cloneSelectorComponent);
}

function cloneSelectorComponent(component: SelectorComponent): SelectorComponent {
  return JSON.parse(JSON.stringify(component)) as SelectorComponent;
}

function hasNesting(selector: Selector): boolean {
  return selector.some(selectorComponentHasNesting);
}

function replaceNesting(selector: Selector, base: Selector): Selector {
  const out: Selector = [];
  for (const component of selector) {
    if (component.type === 'nesting') {
      out.push(...cloneSelector(base));
      continue;
    }
    out.push(replaceNestedNestingComponent(component, base));
  }
  return out;
}

function selectorComponentHasNesting(component: SelectorComponent): boolean {
  if (component.type === 'nesting') return true;

  if (component.type === 'pseudo-class') {
    if (
      component.kind === 'not' ||
      component.kind === 'where' ||
      component.kind === 'is' ||
      component.kind === 'any' ||
      component.kind === 'has'
    ) {
      return selectorListHasNesting(component.selectors);
    }
    if (component.kind === 'host') return component.selectors ? hasNesting(component.selectors) : false;
    if (component.kind === 'nth-child' || component.kind === 'nth-last-child') {
      return component.of ? selectorListHasNesting(component.of) : false;
    }
    if (component.kind === 'local' || component.kind === 'global') return hasNesting(component.selector);
  }

  if (
    component.type === 'pseudo-element' &&
    (component.kind === 'slotted' || component.kind === 'cue-function' || component.kind === 'cue-region-function')
  ) {
    return hasNesting(component.selector);
  }

  return false;
}

function selectorListHasNesting(selectors: SelectorList): boolean {
  return selectors.some(hasNesting);
}

function replaceNestedNestingComponent(component: SelectorComponent, base: Selector): SelectorComponent {
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
        selectors: component.selectors.map((selector) => replaceNesting(selector, base)),
      };
    }
    if (component.kind === 'host') {
      if (!component.selectors) return component;
      return {
        ...component,
        selectors: replaceNesting(component.selectors, base),
      };
    }
    if (component.kind === 'nth-child' || component.kind === 'nth-last-child') {
      if (!component.of) return component;
      return {
        ...component,
        of: component.of.map((selector) => replaceNesting(selector, base)),
      };
    }
    if (component.kind === 'local' || component.kind === 'global') {
      return {
        ...component,
        selector: replaceNesting(component.selector, base),
      };
    }
  }

  if (
    component.type === 'pseudo-element' &&
    (component.kind === 'slotted' || component.kind === 'cue-function' || component.kind === 'cue-region-function')
  ) {
    return {
      ...component,
      selector: replaceNesting(component.selector, base),
    };
  }

  return cloneSelectorComponent(component);
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
