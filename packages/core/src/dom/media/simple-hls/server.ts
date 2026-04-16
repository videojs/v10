import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends HTMLVideoElementHost {
  engine = null;
  destroy() {
    this.detach();
  }
}
