import { shallowEqual } from '@videojs/utils/object';

export class EngineLifecycle {
  #loadRequested?: Promise<void> | null;
  #src = '';
  #config: Record<string, any> = {};
  #prevEngineProps: Record<string, any> | null = null;

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    this.requestLoad();
  }

  get config() {
    return this.#config;
  }

  set config(config: Record<string, any>) {
    this.#config = config;
    this.requestLoad();
  }

  get engineProps(): Record<string, any> {
    return {};
  }

  shouldEngineUpdate(nextEngineProps: Record<string, any>): boolean {
    return !shallowEqual(this.#prevEngineProps, nextEngineProps);
  }

  engineDestroy(): void {
    this.#prevEngineProps = null;
  }

  engineUpdate(): void {}

  async requestLoad() {
    if (this.#loadRequested) return;
    const token = (this.#loadRequested = Promise.resolve());
    await token;
    if (this.#loadRequested !== token) return;
    this.#loadRequested = null;
    this.load();
  }

  load(src?: string) {
    this.#loadRequested = null;
    if (src !== undefined) this.#src = src;

    if (this.shouldEngineUpdate(this.engineProps)) {
      this.engineDestroy();
      this.#prevEngineProps = this.engineProps;
      this.engineUpdate();
    }
  }
}
