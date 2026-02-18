import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { noop } from '@videojs/utils/function';
import type { Selector } from '../../core/shallow-equal';
import { shallowEqual } from '../../core/shallow-equal';
import type { State } from '../../core/state';

export type SnapshotControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Subscribe to a `State<T>` container with optional selector.
 *
 * Without selector: returns full state, re-renders on any state change.
 * With selector: returns selected slice, re-renders only when the slice changes (shallowEqual).
 *
 * @example
 * ```ts
 * #state = new SnapshotController(this, sliderState, (s) => s.value);
 * ```
 */
export class SnapshotController<T extends object, R = T> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #selector: Selector<T, R> | undefined;

  #state: State<T>;
  #cached: R | undefined;
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, state: State<T>);
  constructor(host: ReactiveControllerHost, state: State<T>, selector: Selector<T, R>);
  constructor(host: ReactiveControllerHost, state: State<T>, selector?: Selector<T, R>) {
    this.#host = host;
    this.#state = state;
    this.#selector = selector;
    host.addController(this);
  }

  get value(): R {
    if (!this.#selector) {
      return this.#state.current as unknown as R;
    }

    this.#cached ??= this.#selector(this.#state.current);
    return this.#cached;
  }

  /** Switch to tracking a different state container. */
  track(state: State<T>): void {
    this.#state = state;
    this.#subscribe();
  }

  hostConnected(): void {
    this.#subscribe();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
    this.#cached = undefined;
  }

  #subscribe(): void {
    this.#unsubscribe();

    if (!this.#selector) {
      this.#unsubscribe = this.#state.subscribe(() => this.#host.requestUpdate());
      return;
    }

    const selector = this.#selector;
    this.#cached = selector(this.#state.current);

    this.#unsubscribe = this.#state.subscribe(() => {
      const next = selector(this.#state.current);
      if (!shallowEqual(this.#cached, next)) {
        this.#cached = next;
        this.#host.requestUpdate();
      }
    });
  }
}

export namespace SnapshotController {
  export type Host = SnapshotControllerHost;
}
