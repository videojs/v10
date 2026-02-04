export type SignalKey = PropertyKey;

export class Signals {
  #base = new AbortController();
  #keys = new Map<SignalKey, AbortController>();

  /** The attach-scoped signal. Aborts on detach or reattach. */
  get base(): AbortSignal {
    return this.#base.signal;
  }

  /** Clears all keyed signals, leaving base intact. */
  clear(): void {
    for (const controller of this.#keys.values()) {
      controller.abort();
    }
    this.#keys.clear();
  }

  /** Resets base and clears all keyed signals. */
  reset(): void {
    this.clear();
    this.#base.abort();
    this.#base = new AbortController();
  }

  /** Creates a new signal for the key, superseding any previous signal. */
  supersede(key: SignalKey): AbortSignal {
    this.#keys.get(key)?.abort();
    const controller = new AbortController();
    this.#keys.set(key, controller);
    return AbortSignal.any([this.#base.signal, controller.signal]);
  }
}
