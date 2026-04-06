import type { Constructor } from '@videojs/utils/types';
import { bridgeEvents } from '../utils/bridge-events';
import { defineClassPropHooks } from '../utils/define-class-prop-hooks';

export interface Delegate {
  attach?(target: EventTarget): void;
  detach?(): void;
}

export interface BaseType extends EventTarget {
  attach?(target: EventTarget): void;
  detach?(): void;
  get?(prop: string): any;
  set?(prop: string, val: any): void;
  call?(prop: string, ...args: any[]): any;
}

/**
 * Mixin that intercepts `get`, `set`, and `call` to delegate property access
 * and method calls to an instance of `DelegateClass` before falling through
 * to the base class implementation.
 *
 * Works with both `CustomMediaMixin` and `ProxyMixin`.
 */
export function DelegateMixin<Base extends Constructor<BaseType>, D extends Constructor<Delegate>>(
  BaseClass: Base,
  DelegateClass: D
) {
  class DelegateImpl extends BaseClass {
    #delegate = new DelegateClass();

    constructor(...args: any[]) {
      super(...args);

      if (this.#delegate instanceof EventTarget) {
        bridgeEvents(this.#delegate, this);
      }
    }

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
      this.#delegate.attach?.(target);
      super.attach?.(target);
    }

    detach(): void {
      this.#delegate.detach?.();
      super.detach?.();
    }
  }

  for (let proto = DelegateClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    defineClassPropHooks(DelegateImpl, proto);
  }

  return DelegateImpl as unknown as Constructor<InstanceType<Base> & InstanceType<D>> & Omit<Base, 'prototype'>;
}
