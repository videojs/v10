import { HTMLVideoElementHost } from '../video-host';

export type { PlaybackType, PreloadType, SourceType } from './types';
export { PlaybackTypes, SourceTypes } from './types';

export class HlsMedia extends HTMLVideoElementHost {
  engine = null;
  preferPlayback: string | undefined = 'mse';
  config: Record<string, any> = {};
  debug = false;
  preload = 'metadata';
  load() {}
  destroy() {
    this.detach();
  }
}
