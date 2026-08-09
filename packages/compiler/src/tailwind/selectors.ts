import type { Selector, SelectorComponent, SelectorList } from 'lightningcss';
import type { NameContext, StyleSegment } from '../styles';
import { cloneCssAst } from './css/ast';

export type { Selector, SelectorComponent, SelectorList } from 'lightningcss';

export interface ResolveElementResult {
  className: string;
  chunk?: string | undefined;
  /** Intentionally combine a different recipe into an existing class in the same chunk. */
  merge?: boolean | undefined;
}

export interface ResolveElementContext extends NameContext {}

export interface ResolveClassListContext {
  classes: readonly string[];
  className: string;
  segments: readonly StyleSegment[];
}

export type ResolveElement = (context: ResolveElementContext) => ResolveElementResult | string | null | undefined;
export type ResolveToken = ResolveElement;
export type ResolveClassList = (context: ResolveClassListContext) => readonly string[] | null | undefined;

export function normalizeResolveElementResult(
  resolution: ResolveElementResult | string | null | undefined
): ResolveElementResult | undefined {
  if (resolution == null) return undefined;
  return typeof resolution === 'string' ? { className: resolution } : resolution;
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
