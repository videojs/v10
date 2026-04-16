import { serverMethodError } from '../server-error';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends HTMLVideoElementHost {
  engine = null;
  destroy(): void {
    serverMethodError('SimpleHlsMedia', 'destroy');
  }
}
