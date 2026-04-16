import { serverError } from '../server-error';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends HTMLVideoElementHost {
  engine = null;
  destroy(): void {
    serverError('SimpleHlsMedia.destroy()');
  }
}
