import Hls from 'hls.js';

/** @TODO Move interface/type defs (CJP) */
/** @TODO Narrow and/or parameterize EventTarget via generics/inference (CJP) */
export interface PlaybackEngine extends EventTarget {
  src: HTMLMediaElement['src'] | undefined;
  // NOTE: Unlike other APIs, this *must* be an HTMLMediaElement based on internal and/or external API assumptions (CJP)
  mediaElement: HTMLMediaElement | undefined;
  /** @TODO Widen/extend and/or parameterize EventTarget via generics/inference (CJP) */
  element: HTMLElement | undefined;
  destroy: () => void;
}

export class HlsPlaybackEngine extends EventTarget {
  constructor() {
    super();
  }

  protected _hlsInstance: Hls | undefined;

  get src(): string | undefined {
    return this._hlsInstance?.url ?? undefined;
  }

  set src(src: string | undefined) {
    if (this.src === src) return;

    if (!this._hlsInstance) {
      this._createHlsInstance();
    }

    if (!this.src && src) {
      this._hlsInstance?.loadSource(src);
    }
  }

  // NOTE: Some playback engines may not rely on an underlying HTMLMediaElement but still have
  // an HTMLElement (e.g. HTMLCanvasElement, HTMLImageElement, etc.). This API provides a more
  // generic interface for cases where we want more minimal assumptions (e.g. fullscreen behaviors for most playtforms but not iOS)
  get element(): HTMLElement | undefined {
    return this.mediaElement;
  }

  set element(val) {
    if (this.element === val) return;
    /** @TODO programmatic type checking? (CJP) */
    this.mediaElement = val as HTMLMediaElement;
  }

  get mediaElement(): HTMLMediaElement | undefined {
    return this._hlsInstance?.media ?? undefined;
  }

  set mediaElement(val) {
    if (this.mediaElement === val) return;

    if (!this._hlsInstance) {
      this._createHlsInstance();
    }

    if (!this.mediaElement && val) {
      this._hlsInstance?.attachMedia(val);
    }
  }

  protected _createHlsInstance(): void {
    this._hlsInstance = new Hls();
  }

  protected _destroyHlsInstance(): void {
    this._hlsInstance?.destroy();
    this._hlsInstance = undefined;
  }

  destroy(): void {
    this._destroyHlsInstance();
  }
}

export const createHlsPlaybackEngine = (): PlaybackEngine => new HlsPlaybackEngine();
