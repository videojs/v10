import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { State } from '../../core/state';

import { noop } from '@videojs/utils/function';

export type SnapshotControllerHost = ReactiveControllerHost & HTMLElement;

export interface SnapshotControllerOptions<T extends object> {
  /** Called when state changes (after requestUpdate). */
  onChange?: (snapshot: T) => void;
}

/**
 * Subscribes to state and triggers host updates when state changes.
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
  readonly #state: State<T>;
  readonly #onChange: ((snapshot: T) => void) | undefined;

  #unsubscribe = noop;

  constructor(host: SnapshotControllerHost, state: State<T>, options?: SnapshotControllerOptions<T>) {
    this.#host = host;
    this.#state = state;
    this.#onChange = options?.onChange;
    host.addController(this);
  }

  get value(): T {
    return this.#state.current;
  }

  hostConnected(): void {
    this.#unsubscribe = this.#state.subscribe(() => {
      this.#host.requestUpdate();
      this.#onChange?.(this.#state.current);
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }
}

export namespace SnapshotController {
  export type Host = SnapshotControllerHost;
  export type Options<T extends object> = SnapshotControllerOptions<T>;
}
