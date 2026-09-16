import { defineAttributeProperty, setAttributeFromValue, type AttributeValue } from '@videojs/element';
import { isFunction } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import type { MediaAttributeBindings } from './attributes';
import type { PlaybackAdapter } from './custom-media-element';

/** An element that owns an adapter. */
export interface AdapterElement extends HTMLElement {
  readonly adapter: PlaybackAdapter;
}

const excludedProperties = new Set(['constructor', 'attach', 'detach', 'destroy']);

/**
 * Adapter members the element keeps for itself. `title` is the element's tooltip; the media title stays reachable as
 * `element.adapter.title`.
 */
const elementOwned = new Set(['title']);

/**
 * Put the adapter's public methods and accessors on the element prototype, so the element is the adapter to its
 * callers.
 *
 * A setter whose property reflects through an attribute writes the attribute instead, and the attribute change reaches
 * the adapter; the property then holds one value whichever way it was set. Members the element already has, such as
 * `addEventListener` or `title`, are left alone; in development, any other collision is reported. Underscore-prefixed
 * members are treated as private.
 */
export function forwardAdapterMembers(
  prototype: object,
  Adapter: Constructor<object>,
  bindings: MediaAttributeBindings
): string[] {
  const collisions: string[] = [];
  const properties: string[] = [];

  for (let proto = Adapter.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    if (proto === EventTarget.prototype) break;

    for (const prop of Object.getOwnPropertyNames(proto)) {
      const binding = bindings.byProperty.get(prop);
      if (excludedProperties.has(prop) || prop.startsWith('_') || binding?.destination === 'target') continue;

      if (prop in prototype) {
        if (!elementOwned.has(prop) && !(prop in EventTarget.prototype)) collisions.push(prop);

        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      if (!descriptor) continue;

      const config: PropertyDescriptor = { enumerable: descriptor.enumerable ?? true, configurable: true };

      if (isFunction(descriptor.value)) {
        config.value = function (this: AdapterElement, ...args: unknown[]) {
          return this.adapter[prop](...args);
        };
      } else if (descriptor.get) {
        config.get = function (this: AdapterElement) {
          return this.adapter[prop];
        };

        if (descriptor.set) {
          config.set = function (this: AdapterElement, value: unknown) {
            if (binding) {
              // SAFETY: Attribute bindings carry the converter for the corresponding property value.
              setAttributeFromValue(this, binding, value as AttributeValue);
            } else {
              this.adapter[prop] = value;
            }
          };
          properties.push(prop);
        }
      } else {
        continue;
      }

      Object.defineProperty(prototype, prop, config);
    }
  }

  if (__DEV__ && collisions.length > 0) {
    console.warn(
      `[videojs] ${Adapter.name} defines ${collisions.map((name) => `\`${name}\``).join(', ')}, which HTMLElement already has; the element's own member wins.`
    );
  }

  return properties;
}

/**
 * Give the element an accessor for every routed property `forwardAdapterMembers` did not: owned properties the adapter
 * keeps as fields rather than accessors read the adapter and write the attribute, and reflected properties read and
 * write the attribute alone.
 */
export function reflectAttributes(prototype: HTMLElement, bindings: MediaAttributeBindings): string[] {
  const properties: string[] = [];

  for (const binding of bindings.byProperty.values()) {
    if (binding.destination === 'target') {
      if (defineAttributeProperty(prototype, binding)) properties.push(binding.property);

      continue;
    }

    if (binding.property in prototype) continue;

    Object.defineProperty(prototype, binding.property, {
      get(this: AdapterElement) {
        return this.adapter[binding.property];
      },
      set(this: AdapterElement, value: unknown) {
        // SAFETY: Attribute bindings carry the converter for the corresponding property value.
        setAttributeFromValue(this, binding, value as AttributeValue);
      },
      enumerable: true,
      configurable: true,
    });
    properties.push(binding.property);
  }

  return properties;
}
