import type { AnyConstructor, Constructor } from '@videojs/utils/types';
import { defineClassPropHooks } from '../utils/define-class-prop-hooks';

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
export const ProxyMixin = <T extends EventTarget>(
  PrimaryClass: AnyConstructor<T>,
  ...AdditionalClasses: AnyConstructor<EventTarget>[]
) => {
  class MediaProxy extends EventTarget {
    #target: EventTarget | null = null;

    get target() {
      return this.#target;
    }

    get(prop: keyof EventTarget): any {
      return this.target?.[prop];
    }

    set(prop: keyof EventTarget, val: any): void {
      if (this.target) {
        this.target[prop] = val;
      }
    }

    call(prop: keyof EventTarget, ...args: any[]): any {
      const nativeFn = this.target?.[prop] as ((...args: any[]) => any) | undefined;
      return nativeFn?.apply(this.target, args);
    }

    attach(target: EventTarget): void {
      if (!target || this.#target === target) return;
      this.#target = target;
    }

    detach(): void {
      if (!this.#target) return;
      this.#target = null;
    }
  }

  for (const Class of [PrimaryClass, ...AdditionalClasses]) {
    defineClassPropHooks(MediaProxy, Class.prototype);
  }

  return MediaProxy as unknown as Constructor<T>;
};
