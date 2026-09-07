import { isFunction } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import type { AttributeRoutes } from './attributes';
import type { PlaybackAdapter } from './custom-media-element';

/** An element that owns an adapter. */
export interface AdapterElement extends HTMLElement {
  readonly adapter: PlaybackAdapter;
}

const excludedProperties = new Set(['constructor', 'attach', 'detach', 'destroy']);

/**
 * Put the adapter's methods and accessors on the element prototype, so the element is the adapter to its callers.
 *
 * A setter whose property reflects through an attribute writes the attribute instead, and the attribute change reaches
 * the adapter; the property then holds one value whichever way it was set. Properties the routes mark as reflected are
 * left to `reflectAttributes`.
 */
export function forwardAdapter(prototype: object, Adapter: Constructor<object>, routes: AttributeRoutes): void {
  for (let proto = Adapter.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const prop of Object.getOwnPropertyNames(proto)) {
      if (prop in prototype || excludedProperties.has(prop) || routes.reflected.has(prop)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      if (!descriptor) continue;

      const config: PropertyDescriptor = { enumerable: true, configurable: true };

      if (isFunction(descriptor.value)) {
        config.value = function (this: AdapterElement, ...args: unknown[]) {
          return this.adapter[prop](...args);
        };
      } else if (descriptor.get) {
        const attribute = routes.attributeOf.get(prop);

        config.get = function (this: AdapterElement) {
          return this.adapter[prop];
        };

        if (descriptor.set) {
          config.set = function (this: AdapterElement, value: unknown) {
            if (!attribute) {
              this.adapter[prop] = value;
            } else if (value === true || value === false || value == null) {
              this.toggleAttribute(attribute, Boolean(value));
            } else {
              this.setAttribute(attribute, String(value));
            }
          };
        }
      }

      Object.defineProperty(prototype, prop, config);
    }
  }
}

/** Give the element an accessor for each property that only reflects its attribute. */
export function reflectAttributes(prototype: object, routes: AttributeRoutes): void {
  for (const [prop, { attribute, config }] of routes.reflected) {
    if (Object.hasOwn(prototype, prop)) continue;

    Object.defineProperty(prototype, prop, {
      get(this: HTMLElement) {
        return config.type === Boolean ? this.hasAttribute(attribute) : this.getAttribute(attribute);
      },
      set(this: HTMLElement, value: unknown) {
        if (config.type === Boolean) {
          this.toggleAttribute(attribute, Boolean(value));
        } else {
          this.setAttribute(attribute, String(value));
        }
      },
      enumerable: true,
      configurable: true,
    });
  }
}

const bridgedTypes = new WeakMap<AdapterElement, Set<string>>();

/**
 * Re-dispatch the adapter's events of one type on the element. Call it from `addEventListener`: the adapter is only
 * subscribed the first time someone listens for a type, and composed events are left alone since they already reach the
 * element through the shadow boundary.
 */
export function bridgeEvent(element: AdapterElement, type: string): void {
  let types = bridgedTypes.get(element);

  if (!types) {
    types = new Set();
    bridgedTypes.set(element, types);
  }

  if (types.has(type)) return;

  types.add(type);
  element.adapter.addEventListener(type, (event: Event) => {
    if (!event.composed) element.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
  });
}
