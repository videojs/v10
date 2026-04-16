import { HTMLVideoElementHost } from '../video-host';
import {
  inferSourceType,
  type PlaybackType,
  PlaybackTypes,
  type PreloadType,
  type SourceType,
  SourceTypes,
} from './types';

export { type PlaybackType, PlaybackTypes, type PreloadType, type SourceType, SourceTypes };

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
