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
  #host: ReactiveControllerHost;

  constructor(host: ReactiveControllerHost, state: Store<S>, selector: (state: S) => R);
  constructor(host: ReactiveControllerHost, state: Store<S>);
  constructor(host: ReactiveControllerHost, state: Store<S>, selector?: (state: S) => R) {
    this.#host = host;
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
