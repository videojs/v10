import { namedNodeMapToObject } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';

import type { AttributeRoutes } from './attributes';
import type { MediaTemplate } from './templates';

/**
 * Render the template into the element's shadow root. An existing root, such as a declarative one, is left as it is.
 *
 * @param element - The custom element to render into.
 * @param template - Produces the shadow HTML from the attributes it may render.
 * @param attrs - The attributes handed to the template, typically from `initialAttributes`.
 */
export function renderHost(
  element: HTMLElement,
  template: MediaTemplate,
  attrs: Record<string, string>,
  init: ShadowRootInit = { mode: 'open' }
): ShadowRoot {
  if (element.shadowRoot) return element.shadowRoot;

  const root = element.attachShadow(init);

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
