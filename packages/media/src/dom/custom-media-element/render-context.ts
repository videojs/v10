import { namedNodeMapToObject } from '@videojs/utils/dom';
import { omit, pick } from '@videojs/utils/object';

import { adapterPropsFromAttributes, type MediaAttributeBindings } from './attributes';
import type { MediaAttributeDeclarationsFor } from './target-attributes';
import type { MediaTargetRenderContext } from './targets';

/** Collect initial observed attribute values and the subset safe to render directly onto the adapter target. */
export function createRenderContext<AdapterProps extends object>(
  element: HTMLElement,
  bindings: MediaAttributeBindings,
  Adapter: { readonly defaultProps: AdapterProps },
  adapterDeclarations: MediaAttributeDeclarationsFor<AdapterProps>
): MediaTargetRenderContext<AdapterProps> {
  const attributeValues = pick(namedNodeMapToObject(element.attributes), bindings.observedAttributes);
  const adapterAttributes = [...bindings.byAttribute.values()]
    .filter((binding) => binding.destination === 'adapter')
    .map((binding) => binding.attribute);

  return {
    attributeValues,
    targetAttributeValues: omit(attributeValues, adapterAttributes),
    adapterProps: adapterPropsFromAttributes(Adapter, attributeValues, adapterDeclarations),
  };
}
