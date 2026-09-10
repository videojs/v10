import { isFunction } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import { isForwardedEvent } from '../html-media-adapter';
import type { AttributeRoutes } from './attributes';
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

function writeThroughAttribute(element: HTMLElement, attribute: string, value: unknown): void {
  if (value === true || value === false || value == null) {
    element.toggleAttribute(attribute, Boolean(value));
  } else {
    element.setAttribute(attribute, String(value));
  }
}

/**
 * Put the adapter's public methods and accessors on the element prototype, so the element is the adapter to its
 * callers.
 *
 * A setter whose property reflects through an attribute writes the attribute instead, and the attribute change reaches
 * the adapter; the property then holds one value whichever way it was set. Members the element already has, such as
 * `addEventListener` or `title`, are left alone; in development, any other collision is reported. Underscore-prefixed
 * members are treated as private.
 */
export function forwardAdapter(prototype: object, Adapter: Constructor<object>, routes: AttributeRoutes): void {
  const collisions: string[] = [];

  for (let proto = Adapter.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    if (proto === EventTarget.prototype) break;

    for (const prop of Object.getOwnPropertyNames(proto)) {
      if (excludedProperties.has(prop) || prop.startsWith('_') || routes.reflected.has(prop)) continue;

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
        const attribute = routes.attributeOf.get(prop);

        config.get = function (this: AdapterElement) {
          return this.adapter[prop];
        };

        if (descriptor.set) {
          config.set = function (this: AdapterElement, value: unknown) {
            if (attribute) {
              writeThroughAttribute(this, attribute, value);
            } else {
              this.adapter[prop] = value;
            }
          };
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
}

/**
 * Give the element an accessor for every routed property `forwardAdapter` did not: owned properties the adapter keeps
 * as fields rather than accessors read the adapter and write the attribute, and reflected properties read and write the
 * attribute alone.
 */
export function reflectAttributes(prototype: object, routes: AttributeRoutes): void {
  for (const [prop, attribute] of routes.attributeOf) {
    if (Object.hasOwn(prototype, prop)) continue;

    Object.defineProperty(prototype, prop, {
      get(this: AdapterElement) {
        return this.adapter[prop];
      },
      set(this: AdapterElement, value: unknown) {
        writeThroughAttribute(this, attribute, value);
      },
      enumerable: true,
      configurable: true,
    });
  }

  for (const [prop, { attribute, config }] of routes.reflected) {
    if (Object.hasOwn(prototype, prop)) continue;

    Object.defineProperty(prototype, prop, {
      get(this: HTMLElement) {
        return config.type === Boolean ? this.hasAttribute(attribute) : this.getAttribute(attribute);
      },
      set(this: HTMLElement, value: unknown) {
        writeThroughAttribute(this, attribute, config.type === Boolean ? Boolean(value) : value);
      },
      enumerable: true,
      configurable: true,
    });
  }
}

interface Bridge {
  handler: (event: Event) => void;
  types: Set<string>;
}

const bridges = new WeakMap<AdapterElement, Bridge>();

/** A copy of an event for re-dispatch, keeping the subclass and its init dictionary where the constructor allows it. */
function cloneEvent(event: Event): Event {
  try {
    return new (event.constructor as typeof Event)(event.type, event);
  } catch {
    return new Event(event.type, event);
  }
}

/**
 * Re-dispatch the adapter's events of one type on the element. Call it from `addEventListener`: the adapter is only
 * subscribed the first time someone listens for a type. An adapter's composed copy of an event its target dispatched
 * already reached the element through the shadow boundary, so those are left alone; anything the adapter raises itself
 * comes through, composed or not.
 */
export function bridgeEvent(element: AdapterElement, type: string): void {
  let bridge = bridges.get(element);

  if (!bridge) {
    bridge = {
      types: new Set(),
      handler: (event) => {
        if (event.composed && isForwardedEvent(event)) return;

        element.dispatchEvent(cloneEvent(event));
      },
    };
    bridges.set(element, bridge);
  }

  if (bridge.types.has(type)) return;

  bridge.types.add(type);
  element.adapter.addEventListener(type, bridge.handler);
}

/** Stop re-dispatching the adapter's events. Call it when the adapter is destroyed. */
export function unbridgeEvents(element: AdapterElement): void {
  const bridge = bridges.get(element);
  if (!bridge) return;

  for (const type of bridge.types) element.adapter.removeEventListener(type, bridge.handler);

  bridges.delete(element);
}
