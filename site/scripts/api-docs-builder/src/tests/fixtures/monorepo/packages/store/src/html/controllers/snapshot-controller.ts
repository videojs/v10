interface ReactiveControllerHost {
  addController(controller: ReactiveController): void;
  requestUpdate(): void;
}

interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
}

interface Store<S> {
  getState(): S;
}

/** Takes a snapshot of store state. */
export class SnapshotController<S, R = S> implements ReactiveController {
  /**
   * @param host - The host element.
   * @param state - The store to snapshot.
   * @param selector - Derives a value from state.
   */
  constructor(host: ReactiveControllerHost, state: Store<S>, selector: (state: S) => R);
  /**
   * @param host - The host element.
   * @param state - The store to snapshot.
   */
  constructor(host: ReactiveControllerHost, state: Store<S>);
  constructor(host: ReactiveControllerHost, state: Store<S>, selector?: (state: S) => R) {
    host.addController(this);
  }

  /** The current snapshot value. */
  get value(): R {
    return {} as R;
  }

  /** Track state changes. */
  track(): void {}

  hostConnected(): void {}
  hostDisconnected(): void {}
}
