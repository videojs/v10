/**
 * Mock simple host — mirrors DashAdapter.
 *
 * Exercises: minimal host with just src (read-write) and engine (readonly).
 * No JSDoc on properties — tests that missing descriptions produce undefined.
 * `engine` has no return-type annotation — tests that the checker infers the
 * type (mirrors DashAdapter's unannotated `get engine()`).
 */

// Stub — the builder walks the prototype chain and stops here.
export class HTMLVideoAdapter {
  static readonly host = 'video';

  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}
}

// Stub — audio counterpart, also a prototype-chain stop.
export class HTMLAudioAdapter {
  static readonly host = 'audio';

  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}
}

export class SimpleHost extends HTMLVideoAdapter {
  static readonly defaultProps = {
    src: '',
    source: null,
    streamType: 'unknown',
  };

  #src: string = '';
  #engine: object = {};

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get engine() {
    return this.#engine;
  }
}
