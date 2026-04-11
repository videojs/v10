import { SpfMedia } from '@videojs/spf/dom';
import type { PlaybackEngine } from '@videojs/spf/playback-engine';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends HTMLVideoElementHost {
  #spf = new SpfMedia();

  get engine(): PlaybackEngine {
    return this.#spf.engine;
  }

  get src() {
    return this.#spf.src;
  }

  set src(value: string) {
    this.#spf.src = value;
  }

  get preload() {
    return this.#spf.preload;
  }

  set preload(value: '' | 'none' | 'metadata' | 'auto') {
    this.#spf.preload = value;
  }

  play() {
    return this.#spf.play();
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#spf.attach(target);
  }

  detach() {
    this.#spf.detach();
    super.detach();
  }

  destroy() {
    this.#spf.destroy();
  }
}
