import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { Reactive, Tracker } from '../../core/state';

import { noop } from '@videojs/utils/function';

import { track } from '../../core/state';

export type SnapshotControllerHost = ReactiveControllerHost & HTMLElement;

export interface SnapshotControllerOptions<T extends object> {
  /** Called when tracked state changes (after requestUpdate). */
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
  readonly #onChange: ((snapshot: T) => void) | undefined;
  #tracker: Tracker<T> | null = null;
  #unsubscribe = noop;

  constructor(host: SnapshotControllerHost, state: Reactive<T>, options?: SnapshotControllerOptions<T>) {
    this.#host = host;
    this.#state = state;
    this.#onChange = options?.onChange;
    host.addController(this);
  }

  /** Returns the tracking proxy. Access properties to subscribe to their changes. */
  get value(): T {
    if (!this.#tracker) {
      this.#tracker = track(this.#state);
    }
    return this.#tracker.tracked;
  }

  hostConnected(): void {
    if (!this.#tracker) {
      this.#tracker = track(this.#state);
    }

    this.#unsubscribe = this.#tracker.subscribe(() => {
      this.#host.requestUpdate();
      this.#onChange?.(this.#state);
    });
  }

  hostUpdated(): void {
    this.#tracker?.next();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
    this.#tracker = null;
  }
}

export namespace SnapshotController {
  export type Host = SnapshotControllerHost;
  export type Options<T extends object> = SnapshotControllerOptions<T>;
}
