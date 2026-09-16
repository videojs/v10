import { MediaIconElement, type IconMap } from '@videojs/icons/element/base';
import { isFunction } from '@videojs/utils/predicate';

type IconRegistry = CustomElementConstructor & Pick<typeof MediaIconElement, 'register'>;

/** Register an exact set of SVGs for generated source that renders `<media-icon>`. */
export function registerIcons(family: string, icons: IconMap): void {
  const customElementRegistry = globalThis.customElements;
  const registeredElement = customElementRegistry?.get('media-icon');

  if (registeredElement && !supportsIconRegistration(registeredElement)) {
    throw new Error('The registered <media-icon> element does not support icon registration.');
  }

  const registry = registeredElement ?? MediaIconElement;

  registry.register(family, icons);

  if (customElementRegistry && globalThis.HTMLElement && !registeredElement)
    customElementRegistry.define('media-icon', MediaIconElement);
}

function supportsIconRegistration(element: CustomElementConstructor): element is IconRegistry {
  return 'register' in element && isFunction(element.register);
}
