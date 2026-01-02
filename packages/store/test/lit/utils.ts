import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

/**
 * Mock host for testing controllers (no DOM required).
 */
export class MockHost implements ReactiveControllerHost {
  controllers: ReactiveController[] = [];
  updateCount = 0;

  addController(controller: ReactiveController): void {
    this.controllers.push(controller);
  }

  removeController(controller: ReactiveController): void {
    const index = this.controllers.indexOf(controller);
    if (index >= 0) {
      this.controllers.splice(index, 1);
    }
  }

  requestUpdate(): void {
    this.updateCount++;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // Simulate lifecycle
  connect(): void {
    for (const controller of this.controllers) {
      controller.hostConnected?.();
    }
  }

  disconnect(): void {
    for (const controller of this.controllers) {
      controller.hostDisconnected?.();
    }
  }
}

/**
 * Mock host element for testing context (requires DOM).
 * Extends HTMLElement to work with Lit context.
 */
export class MockHostElement extends HTMLElement implements ReactiveControllerHost {
  controllers: ReactiveController[] = [];
  updateCount = 0;

  addController(controller: ReactiveController): void {
    this.controllers.push(controller);
  }

  removeController(controller: ReactiveController): void {
    const index = this.controllers.indexOf(controller);
    if (index >= 0) {
      this.controllers.splice(index, 1);
    }
  }

  requestUpdate(): void {
    this.updateCount++;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  connect(): void {
    for (const controller of this.controllers) {
      controller.hostConnected?.();
    }
  }

  disconnect(): void {
    for (const controller of this.controllers) {
      controller.hostDisconnected?.();
    }
  }
}

// Register the custom element for tests
if (!customElements.get('mock-host')) {
  customElements.define('mock-host', MockHostElement);
}
