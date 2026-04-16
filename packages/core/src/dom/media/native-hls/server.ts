import { HTMLVideoElementHost } from '../video-host';

export class NativeHlsMedia extends HTMLVideoElementHost {
  engine = null;
  preload = 'metadata';
  destroy() {
    this.detach();
  }
}
