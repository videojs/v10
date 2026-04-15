import { HTMLVideoElementHost } from '../video-host';

export type { default as Hls } from 'hls.js';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof SourceTypes)[keyof typeof SourceTypes];

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export const SourceTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

export class HlsMedia extends HTMLVideoElementHost {
  #src = '';
  #type: SourceType | undefined;
  #preferPlayback: PlaybackType | undefined = 'mse';
  #config: Record<string, any> = {};
  #debug = false;
  #preload: PreloadType = 'metadata';

  get engine() {
    return null;
  }

  get error() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
  }

  get type() {
    return this.#type ?? inferSourceType(this.src);
  }

  set type(value: SourceType | undefined) {
    this.#type = value;
  }

  get preferPlayback() {
    return this.#preferPlayback;
  }

  set preferPlayback(value) {
    this.#preferPlayback = value;
  }

  get config() {
    return this.#config;
  }

  set config(config) {
    this.#config = config;
  }

  get debug() {
    return this.#debug;
  }

  set debug(debug) {
    this.#debug = debug;
  }

  get preload() {
    return this.#preload;
  }

  set preload(value) {
    this.#preload = value;
  }

  load() {}

  destroy() {
    this.detach();
  }
}

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}
