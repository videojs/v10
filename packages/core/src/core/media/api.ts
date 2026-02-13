import type { AnyConstructor, Constructor } from '@videojs/utils/types';

export interface MediaApiTarget extends EventTarget {}

type API_TYPE = 0 | 1 | 2;

const API_METHOD: API_TYPE = 0;
const API_GET: API_TYPE = 1;
const API_GET_SET: API_TYPE = 2;

/**
 * This class provides a base for a uniform Media API across all media types.
 *
 * Many methods and properties will need no translation and are proxied directly to the attached target.
 * For example, the `play` and `pause` methods are proxied directly to the attached target.
 *
 * Child classes can override the proxied methods and properties to provide custom behavior.
 * For example, the `src` property for HLS media is proxied to the HLS engine, not the target itself.
 *
 * The `get`, `set`, and `call` methods can be overridden to provide catch-all custom behavior.
 */
export const MediaApiMixin = <T extends EventTarget>(
  ...MediaApiTargetClasses: AnyConstructor<T extends [unknown, ...unknown[]] ? T : any>[]
) => {
  class MediaApi {
    static extends(...MediaApiTargetClasses: AnyConstructor<T>[]) {
      const props = getClassProps<T>(...MediaApiTargetClasses);

      for (const [prop, type] of props.entries()) {
        if (prop in MediaApi.prototype) continue;

        const config: PropertyDescriptor = {};
        if (type === API_METHOD) {
          config.value = function (this: MediaApi, ...args: any[]) {
            return this.call(prop as keyof MediaApiTarget, ...args);
          };
        } else if (type === API_GET || type === API_GET_SET) {
          config.get = function (this: MediaApi) {
            return this.get(prop as keyof MediaApiTarget);
          };
          if (type === API_GET_SET) {
            config.set = function (this: MediaApi, val: any) {
              this.set(prop as keyof MediaApiTarget, val);
            };
          }
        }

        Object.defineProperty(MediaApi.prototype, prop, config);
      }
    }

    #target: MediaApiTarget | null = null;

    get target() {
      return this.#target;
    }

    get(prop: keyof MediaApiTarget): any {
      return this.target?.[prop];
    }

    set(prop: keyof MediaApiTarget, val: any): void {
      if (this.target) {
        this.target[prop] = val;
      }
    }

    call(prop: keyof MediaApiTarget, ...args: any[]): any {
      const nativeFn = this.target?.[prop] as ((...args: any[]) => any) | undefined;
      return nativeFn?.apply(this.target, args);
    }

    attach(target: MediaApiTarget): void {
      if (!target || this.#target === target) return;
      this.#target = target;
    }

    detach(): void {
      if (!this.#target) return;
      this.#target = null;
    }
  }

  MediaApi.extends(...MediaApiTargetClasses);

  return MediaApi as unknown as Constructor<T> & typeof MediaApi;
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
