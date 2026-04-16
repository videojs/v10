import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends HTMLVideoElementHost {
  #src = '';

  get engine() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
  }

  destroy() {
    this.detach();
  }
}
