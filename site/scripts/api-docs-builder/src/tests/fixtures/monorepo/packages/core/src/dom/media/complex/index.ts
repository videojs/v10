/**
 * Mock complex delegate — mirrors HlsMediaDelegate.
 *
 * Exercises: multiple getter/setter pairs with JSDoc descriptions,
 * readonly properties, boolean type, overlap with native Attributes
 * (src, preload) that should be deduplicated by the builder.
 */
export class ComplexDelegate {
  #src: string = '';
  #type: string | undefined;
  #preferPlayback: string | undefined = 'mse';
  #config: Record<string, any> = {};
  #debug: boolean = false;
  #preload: string = 'metadata';
  #engine: object | null = null;

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  /** Explicit source type. When unset, inferred from the source URL extension. */
  get type(): string | undefined {
    return this.#type;
  }

  set type(value: string | undefined) {
    this.#type = value;
  }

  /** Whether to prefer `'mse'` or `'native'` playback. */
  get preferPlayback(): string | undefined {
    return this.#preferPlayback;
  }

  set preferPlayback(value: string | undefined) {
    this.#preferPlayback = value;
  }

  get config(): Record<string, any> {
    return this.#config;
  }

  set config(value: Record<string, any>) {
    this.#config = value;
  }

  /** Enable debug logging. */
  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    this.#debug = value;
  }

  get preload(): string {
    return this.#preload;
  }

  set preload(value: string) {
    this.#preload = value;
  }

  /** The underlying playback engine instance. */
  get engine(): object | null {
    return this.#engine;
  }

  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}
}

export class ComplexCustomMedia {}
