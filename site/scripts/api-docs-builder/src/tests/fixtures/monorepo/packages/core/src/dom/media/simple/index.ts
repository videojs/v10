/**
 * Mock simple delegate — mirrors DashMediaDelegate.
 *
 * Exercises: minimal delegate with just src (read-write) and engine (readonly).
 * No JSDoc on properties — tests that missing descriptions produce undefined.
 */
export class SimpleDelegate {
  #src: string = '';
  #engine: object = {};

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get engine(): object {
    return this.#engine;
  }

  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}
}

export class SimpleCustomMedia {}
