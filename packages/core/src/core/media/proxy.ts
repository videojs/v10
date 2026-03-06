import type { AnyConstructor, Constructor } from '@videojs/utils/types';
import { defineClassPropHooks } from '../utils/define-class-prop-hooks';

export interface MediaApiProxyTarget extends EventTarget {}

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
export const MediaProxyMixin = <T extends EventTarget>(
  PrimaryClass: AnyConstructor<T>,
  ...AdditionalClasses: AnyConstructor<EventTarget>[]
) => {
  class MediaApiProxy {
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

  for (const Class of [PrimaryClass, ...AdditionalClasses]) {
    defineClassPropHooks(MediaApiProxy, Class.prototype);
  }

  return MediaApiProxy as unknown as Constructor<T>;
};
