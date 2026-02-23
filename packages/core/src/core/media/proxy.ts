import type { AnyConstructor, Constructor } from '@videojs/utils/types';

export interface MediaApiProxyTarget extends EventTarget {}

type API_TYPE = 0 | 1 | 2;

const API_METHOD: API_TYPE = 0;
const API_GET: API_TYPE = 1;
const API_GET_SET: API_TYPE = 2;

/**
 * This mixin creates an API from the passed classes and proxies the methods and properties to the attached target.
 *
 * Many methods and properties will need no translation and are proxied directly to the attached target.
 * For example, the `play` and `pause` methods are proxied directly to the attached target.
 *
 * Child classes can override the proxied methods and properties to provide custom behavior.
 * For example, the `src` property for HLS media is proxied to the HLS engine, not the target itself.
 *
 * The `get`, `set`, and `call` methods can be overridden to provide catch-all custom behavior.
 */
export const MediaApiProxyMixin = <T extends EventTarget>(
  ...MediaApiTargetClasses: AnyConstructor<T extends [unknown, ...unknown[]] ? T : any>[]
) => {
  class MediaApiProxy {
    static extends(...MediaApiTargetClasses: AnyConstructor<T>[]) {
      const props = getClassProps<T>(...MediaApiTargetClasses);

      for (const [prop, type] of props.entries()) {
        if (prop in MediaApiProxy.prototype) continue;

        const config: PropertyDescriptor = {};
        if (type === API_METHOD) {
          config.value = function (this: MediaApiProxy, ...args: any[]) {
            return this.call(prop as keyof MediaApiProxyTarget, ...args);
          };
        } else if (type === API_GET || type === API_GET_SET) {
          config.get = function (this: MediaApiProxy) {
            return this.get(prop as keyof MediaApiProxyTarget);
          };
          if (type === API_GET_SET) {
            config.set = function (this: MediaApiProxy, val: any) {
              this.set(prop as keyof MediaApiProxyTarget, val);
            };
          }
        }

        Object.defineProperty(MediaApiProxy.prototype, prop, config);
      }
    }

    #target: MediaApiProxyTarget | null = null;

    get target() {
      return this.#target;
    }

    get(prop: keyof MediaApiProxyTarget): any {
      return this.target?.[prop];
    }

    set(prop: keyof MediaApiProxyTarget, val: any): void {
      if (this.target) {
        this.target[prop] = val;
      }
    }

    call(prop: keyof MediaApiProxyTarget, ...args: any[]): any {
      const nativeFn = this.target?.[prop] as ((...args: any[]) => any) | undefined;
      return nativeFn?.apply(this.target, args);
    }

    attach(target: MediaApiProxyTarget): void {
      if (!target || this.#target === target) return;
      this.#target = target;
    }

    detach(): void {
      if (!this.#target) return;
      this.#target = null;
    }
  }

  MediaApiProxy.extends(...MediaApiTargetClasses);

  return MediaApiProxy as unknown as Constructor<T> & typeof MediaApiProxy;
};

/**
 * Helper function to get the methods, getters, and setters from a class prototype.
 */
export function getClassProps<T extends EventTarget>(...Classes: AnyConstructor<T>[]) {
  const props = new Map<keyof T, API_TYPE>();
  for (const Class of Classes) {
    const names = Object.getOwnPropertyNames(Class.prototype) as (keyof T)[];
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      if (typeof descriptor?.value === 'function') {
        props.set(name, API_METHOD);
      } else if (typeof descriptor?.get === 'function') {
        if (typeof descriptor?.set === 'function') {
          props.set(name, API_GET_SET);
        } else {
          props.set(name, API_GET);
        }
      }
    }
  }
  return props;
}
