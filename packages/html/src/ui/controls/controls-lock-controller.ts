import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { controlsContext } from './context';

export type ControlsLockControllerHost = ReactiveControllerHost & HTMLElement;

/** Holds a controls visibility lock for an HTML component interaction. */
export class ControlsLockController implements ReactiveController {
  readonly #controls: ContextConsumer<typeof controlsContext, ControlsLockControllerHost>;
  #locked = false;
  #requester: (() => () => void) | null = null;
  #release: (() => void) | null = null;

  constructor(host: ControlsLockControllerHost) {
    this.#controls = new ContextConsumer(host, { context: controlsContext, subscribe: true });
    host.addController(this);
  }

  lock(): void {
    if (this.#locked) return;
    this.#locked = true;
    this.#sync();
  }

  unlock(): void {
    if (!this.#locked) return;
    this.#locked = false;
    this.#releaseLock();
  }

  hostConnected(): void {
    this.#sync();
  }

  hostUpdated(): void {
    this.#sync();
  }

  hostDisconnected(): void {
    this.#locked = false;
    this.#releaseLock();
  }

  #sync(): void {
    const requester = this.#controls.value?.requestControlsLock ?? null;

    if (!this.#locked || !requester) {
      this.#releaseLock();
      return;
    }

    if (this.#requester === requester && this.#release) return;

    this.#releaseLock();
    this.#requester = requester;
    this.#release = requester();
  }

  #releaseLock(): void {
    this.#release?.();
    this.#release = null;
    this.#requester = null;
  }
}
