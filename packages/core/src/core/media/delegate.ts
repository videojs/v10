import type { Constructor } from '@videojs/utils/types';

import { defineClassPropHooks } from '../utils/define-class-prop-hooks';

export interface Delegate {
  attach?(target: EventTarget): void;
  detach?(): void;
}

// Detects readonly vs writable properties via conditional type identity check.
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
  [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

type SettableKeys<T> = {
  [K in WritableKeys<T>]: T[K] extends (...args: any[]) => any ? never : K;
}[WritableKeys<T>];

type ExcludeInternal<K> = K extends `_${string}` ? never : K;

export type InferDelegateProps<D extends abstract new (...args: any[]) => any> = Partial<
  Pick<InstanceType<D>, ExcludeInternal<SettableKeys<InstanceType<D>>>>
>;

/**
 * Mixin that intercepts `get`, `set`, and `call` to delegate property access
 * and method calls to an instance of `DelegateClass` before falling through
 * to the base class implementation.
 *
 * Works with both `CustomMediaMixin` and `ProxyMixin`.
 */
export function DelegateMixin<Base extends Constructor<any>, D extends Constructor<Delegate>>(
  BaseClass: Base,
  DelegateClass: D
) {
  class DelegateImpl extends (BaseClass as Constructor<any>) {
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

  for (let proto = DelegateClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    defineClassPropHooks(DelegateImpl, proto);
  }

  return DelegateImpl as unknown as Constructor<
    InstanceType<Base> &
      InstanceType<D> & {
        attach(target: EventTarget): void;
        detach(): void;
      }
  > &
    Omit<Base, 'prototype'>;
}
