import { HTMLVideoElementHost } from '../video-host';

export class DashMedia extends HTMLVideoElementHost {
  #src = '';

  get engine() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src) {
    this.#src = src;
  }

  destroy() {
    this.detach();
  }
}
