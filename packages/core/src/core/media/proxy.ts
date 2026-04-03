import type { AnyConstructor, Constructor } from '@videojs/utils/types';
import { defineClassPropHooks } from '../utils/define-class-prop-hooks';

export interface MediaProxy {
  readonly target: EventTarget | null;
  get(prop: keyof EventTarget): any;
  set(prop: keyof EventTarget, val: any): void;
  call(prop: keyof EventTarget, ...args: any[]): any;
  attach(target: EventTarget): void;
  detach(): void;
}

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
export const ProxyMixin = <T extends EventTarget>(BaseClass: AnyConstructor<T>) => {
  class MediaProxyImpl extends EventTarget {
    #target: EventTarget | null = null;
    #types = new Set<string>();

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
      for (const type of this.#types) {
        target.addEventListener(type, this.#forwardEvent);
      }
    }

    detach(): void {
      if (!this.#target) return;
      for (const type of this.#types) {
        this.#target.removeEventListener(type, this.#forwardEvent);
      }
      this.#target = null;
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void {
      if (!this.#types.has(type)) {
        this.#types.add(type);
        this.#target?.addEventListener(type, this.#forwardEvent);
      }
      super.addEventListener(type, listener, options);
    }

    #forwardEvent = (event: Event) => {
      this.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
    };
  }

  for (
    let proto = BaseClass.prototype;
    proto && !Object.prototype.isPrototypeOf.call(proto, MediaProxyImpl.prototype);
    proto = Object.getPrototypeOf(proto)
  ) {
    defineClassPropHooks(MediaProxyImpl, proto);
  }

  return MediaProxyImpl as unknown as Constructor<T & MediaProxy>;
};
