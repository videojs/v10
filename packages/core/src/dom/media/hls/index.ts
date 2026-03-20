import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';
import { HlsMediaTextTracksMixin } from './text-tracks';

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];

const defaultConfig = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
};

class HlsMediaDelegateBase implements Delegate {
  #target: EventTarget | null = null;
  #engine: Hls | null = null;
  #loadRequested?: Promise<void> | null;
  #src: string = '';
  #debug: boolean = false;
  #preferPlayback: PlaybackType | undefined = 'mse';

  constructor() {
    this.#initialize();
  }

  #initialize(): void {
    this.#engine?.destroy();
    this.#engine = null;

    if (this.#preferPlayback === PlaybackTypes.NATIVE) return;
    if (!Hls.isSupported()) return;

    this.#engine = new Hls({
      ...defaultConfig,
      debug: this.#debug,
    });

    if (this.#target) {
      this.#engine.attachMedia(this.#target as HTMLMediaElement);
    }
  }

  get engine(): Hls | null {
    return this.#engine;
  }

  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    if (this.#debug === value) return;
    this.#debug = value;

    if (this.#loadRequested) {
      this.#initialize();
    }
  }

  get preferPlayback(): PlaybackType | undefined {
    return this.#preferPlayback;
  }

  set preferPlayback(value: PlaybackType | undefined) {
    if (this.#preferPlayback === value) return;
    this.#preferPlayback = value;
    this.#initialize();
  }

  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }

  get src(): string {
    return this.#src;
  }

  async #requestLoad() {
    if (this.#loadRequested) return;
    await (this.#loadRequested = Promise.resolve());
    this.#loadRequested = null;
    this.load();
  }

  load(): void {
    if (this.#engine) {
      this.#engine.loadSource(this.#src);
    } else if (this.#target) {
      (this.#target as HTMLMediaElement).src = this.#src;
    }
  }

  attach(target: EventTarget): void {
    this.#target = target;
    this.#engine?.attachMedia(target as HTMLMediaElement);
  }

  detach(): void {
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#engine?.destroy();
    this.#engine = null;
    this.#target = null;
  }
}

export const HlsMediaDelegate = HlsMediaTextTracksMixin(HlsMediaDelegateBase);

// This is used by the web component because it needs to extend HTMLElement!
export class HlsCustomMedia extends DelegateMixin(CustomVideoElement, HlsMediaDelegate) {}

// This is used by the React component.
export class HlsMedia extends DelegateMixin(VideoProxy, HlsMediaDelegate) {}
