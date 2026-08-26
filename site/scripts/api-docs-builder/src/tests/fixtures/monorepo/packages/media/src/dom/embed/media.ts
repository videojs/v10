/** Mock iframe-backed media host — mirrors VimeoMedia. */
import type { EmbedSource } from './source';

export const embedMediaDefaultProps = {
  src: '',
  autoplay: false,
  source: null,
};

export class EmbedHost extends EventTarget {
  #src = embedMediaDefaultProps.src;
  #autoplay = embedMediaDefaultProps.autoplay;
  #source: EmbedSource | null = null;

  get src(): string {
    return this.#src;
  }
  set src(value: string) {
    this.#src = value;
  }

  get autoplay(): boolean {
    return this.#autoplay;
  }
  set autoplay(value: boolean) {
    this.#autoplay = value;
  }

  /** Embed URL or id in `src`, plus embed parameters under `engine.embed`. */
  get source(): EmbedSource | null {
    return this.#source;
  }
  set source(value: EmbedSource | null) {
    this.#source = value;
  }

  /** Start playback through the embedded player. */
  play(): Promise<void> {
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }

  attach(_target: HTMLIFrameElement): void {
    const emit = (type: string) => this.dispatchEvent(new Event(type));
    emit('waiting');
    for (const type of ['loadedmetadata', 'adapterready']) {
      this.dispatchEvent(new Event(type));
    }
  }
  detach(): void {}
  destroy(): void {}
}
