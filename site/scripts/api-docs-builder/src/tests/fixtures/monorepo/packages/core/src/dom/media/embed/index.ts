/** Mock iframe-backed media host — mirrors VimeoMedia. */
export const embedMediaDefaultProps = {
  src: '',
  autoplay: false,
};

export class EmbedHost extends EventTarget {
  #src = embedMediaDefaultProps.src;
  #autoplay = embedMediaDefaultProps.autoplay;

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
