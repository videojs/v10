import { namedNodeMapToObject } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';

import type { AttributeRoutes } from './attributes';
import type { MediaTargetRenderContext } from './targets';

/** Collect initial observed attribute values and the subset safe to render directly onto the adapter target. */
export function createRenderContext(element: HTMLElement, routes: AttributeRoutes): MediaTargetRenderContext {
  const attributeValues = pick(namedNodeMapToObject(element.attributes), routes.observed);

  return {
    attributeValues,
    targetAttributeValues: omit(attributeValues, [...routes.ownerOf.keys()]),
  };
}
