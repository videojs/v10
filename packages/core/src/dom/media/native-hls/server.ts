import { throwServerError } from '../server-error';
import { HTMLVideoElementHost } from '../video-host';

export class NativeHlsMedia extends HTMLVideoElementHost {
  engine = null;
  preload = 'metadata';
  destroy(): void {
    throwServerError('NativeHlsMedia.destroy()');
  }
}
