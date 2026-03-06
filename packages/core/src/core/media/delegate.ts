import type { Constructor } from '@videojs/utils/types';

export interface MediaDelegate {
  attach?(target: EventTarget): void;
  detach?(): void;
}

/**
 * Mixin that intercepts `get`, `set`, and `call` to delegate property access
 * and method calls to an instance of `DelegateClass` before falling through
 * to the base class implementation.
 *
 * Works with both `CustomMediaMixin` and `MediaProxyMixin`.
 */
export function MediaDelegateMixin<Base extends Constructor<any>, Delegate extends Constructor<MediaDelegate>>(
  BaseClass: Base,
  DelegateClass: Delegate
) {
  class DelegateMedia extends (BaseClass as Constructor<any>) {
    #delegate = new DelegateClass();

    get(prop: string): any {
      if (prop in this.#delegate) {
        return (this.#delegate as any)[prop];
      }
      return super.get?.(prop);
    }

    set(prop: string, val: any): void {
      if (prop in this.#delegate) {
        (this.#delegate as any)[prop] = val;
        return;
      }
      super.set?.(prop, val);
    }

    call(prop: string, ...args: any[]): any {
      if (prop in this.#delegate) {
        return (this.#delegate as any)[prop](...args);
      }
      return super.call?.(prop, ...args);
    }

    attach(target: EventTarget): void {
      super.attach?.(target);
      this.#delegate.attach?.(target);
    }

    detach(): void {
      this.#delegate.detach?.();
      super.detach?.();
    }
  }

  return DelegateMedia as unknown as Constructor<
    InstanceType<Base> &
      InstanceType<Delegate> & {
        attach(target: EventTarget): void;
        detach(): void;
      }
  > &
    Omit<Base, 'prototype'>;
}
