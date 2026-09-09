interface ReactiveControllerHost {
  addController(controller: ReactiveController): void;
  requestUpdate(): void;
}

interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
}

/** Manages the video player lifecycle. */
export class PlayerController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  /** Whether the player is ready. */
  get ready(): boolean {
    return false;
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
