import { serverMethodError } from '../server-error';
import { HTMLVideoElementHost } from '../video-host';

export * from './types';

export class HlsMedia extends HTMLVideoElementHost {
  engine = null;
  preferPlayback: string | undefined = 'mse';
  config: Record<string, any> = {};
  debug = false;
  preload = 'metadata';
  load(): void {
    serverMethodError('HlsMedia', 'load');
  }
  destroy(): void {
    serverMethodError('HlsMedia', 'destroy');
  }
}
