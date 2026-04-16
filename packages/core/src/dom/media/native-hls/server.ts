import type { PreloadType } from '../hls/types';
import { HTMLVideoElementHost } from '../video-host';

export type { PreloadType };

export class NativeHlsMedia extends HTMLVideoElementHost {
  #src = '';
  #preload: PreloadType = 'metadata';

  get engine() {
    return null;
  }

  get error() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
  }

  get preload() {
    return this.#preload;
  }

  set preload(value: PreloadType) {
    this.#preload = value;
  }

  destroy() {
    this.detach();
  }
}
