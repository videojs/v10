import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { Reactive } from '../../core/state';

import { noop } from '@videojs/utils/function';

import { subscribeKeys } from '../../core/state';

export type SnapshotControllerHost = ReactiveControllerHost & HTMLElement;

export interface SnapshotControllerOptions<T extends object> {
  /** Called when tracked state changes (after requestUpdate) */
  onChange?: (snapshot: T) => void;
}

/**
 * Subscribes to reactive state and triggers host updates when tracked properties change.
 *
 * Automatically tracks which properties are accessed during render and only
 * subscribes to changes on those specific keys.
 *
 * @example Basic usage
 * ```ts
 * class MyElement extends LitElement {
 *   #state = new SnapshotController(this, store.state);
 *
 *   render() {
 *     const { volume, muted } = this.#state.value;
 *     return html`<span>${muted ? 'Muted' : volume}</span>`;
 *   }
 * }
 * ```
 *
 * @example With onChange callback
 * ```ts
 * class MyElement extends LitElement {
 *   #state = new SnapshotController(this, store.state, {
 *     onChange: (state) => console.log('State changed:', state.volume),
 *   });
 * }
 * ```
 */
export class SnapshotController<T extends object> implements ReactiveController {
  readonly #host: SnapshotControllerHost;
  readonly #state: Reactive<T>;
  readonly #trackedKeys = new Set<PropertyKey>();
  readonly #subscribedKeys = new Set<PropertyKey>();
  readonly #trackingWrapper: T;
  readonly #onChange: ((snapshot: T) => void) | undefined;
  #unsubscribe = noop;

  constructor(host: SnapshotControllerHost, state: Reactive<T>, options?: SnapshotControllerOptions<T>) {
    this.#host = host;
    this.#state = state;
    this.#onChange = options?.onChange;

    // Create tracking wrapper that records property access
    this.#trackingWrapper = new Proxy(state, {
      get: (target, prop, receiver) => {
        // Skip symbols (internal Lit/JS props)
        if (typeof prop !== 'symbol') {
          this.#trackedKeys.add(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    host.addController(this);
  }

  /** Returns the tracking wrapper. Access properties to subscribe to their changes. */
  get value(): T {
    return this.#trackingWrapper;
  }

  hostConnected(): void {
    this.#resubscribe();
  }

  hostUpdated(): void {
    // Resubscribe after each render with newly tracked keys
    this.#resubscribe();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
    this.#subscribedKeys.clear();
  }

  #resubscribe(): void {
    const keys = Array.from(this.#trackedKeys);
    this.#trackedKeys.clear();

    // Skip resubscription if keys haven't changed
    const keysChanged = keys.length !== this.#subscribedKeys.size || keys.some(k => !this.#subscribedKeys.has(k));

    if (!keysChanged) return;

    // Keys changed - resubscribe
    this.#unsubscribe();
    this.#subscribedKeys.clear();
    keys.forEach(k => this.#subscribedKeys.add(k));

    if (keys.length === 0) return;

    this.#unsubscribe = subscribeKeys(this.#state, keys as (keyof T)[], () => {
      this.#host.requestUpdate();
      this.#onChange?.(this.#state);
    });
  }
}

export namespace SnapshotController {
  export type Host = SnapshotControllerHost;
  export type Options<T extends object> = SnapshotControllerOptions<T>;
}
