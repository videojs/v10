import { HTMLVideoElementHost } from '../video-host';
import { NativeHlsMediaErrorsMixin } from './errors';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

class NativeHlsMediaBase extends HTMLVideoElementHost {
  #src = '';
  #preload: PreloadType = 'metadata';

  get engine() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    if (this.target) this.target.src = src;
  }

  get preload() {
    return this.#preload;
  }

  set preload(value: PreloadType) {
    this.#preload = value;
    if (this.target) this.target.preload = value;
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    if (this.preload !== target.preload) target.preload = this.preload;
    if (this.src) target.src = this.src;
  }

  detach() {
    super.detach();
  }

  destroy() {}
}

export class NativeHlsMedia extends NativeHlsMediaErrorsMixin(NativeHlsMediaBase) {}
