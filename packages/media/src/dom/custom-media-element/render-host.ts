import { namedNodeMapToObject } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';

import type { AttributeRoutes } from './attributes';
import type { MediaTemplate } from './templates';

/** The statics an element class carries for `renderHost`: its template and, optionally, its shadow root options. */
export interface HostElementConstructor {
  template: MediaTemplate;
  shadowRootOptions?: ShadowRootInit;
}

/**
 * Render the element's static `template` into its shadow root, attached with its static `shadowRootOptions`. An
 * existing root, such as a declarative one, is left as it is.
 *
 * @param element - The custom element to render into.
 * @param attrs - The attributes handed to the template, typically from `initialAttributes`.
 */
export function renderHost(element: HTMLElement, attrs: Record<string, string>): ShadowRoot {
  if (element.shadowRoot) return element.shadowRoot;

  const { template, shadowRootOptions = { mode: 'open' } } = element.constructor as unknown as HostElementConstructor;
  const root = element.attachShadow(shadowRootOptions);

  root.innerHTML = template(attrs);

  return root;
}

/**
 * The attributes present on the element that its template may render: the observed ones, minus those an adapter
 * property owns when they would otherwise land on a native element and start a load of their own.
 */
export function initialAttributes(
  element: HTMLElement,
  routes: AttributeRoutes,
  { passthrough }: { passthrough: boolean }
): Record<string, string> {
  const attrs = pick(namedNodeMapToObject(element.attributes), routes.observed);

  return passthrough ? omit(attrs, [...routes.ownerOf.keys()]) : attrs;
}
