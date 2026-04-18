import * as dashjs from 'dashjs';
import type { MediaEngineHost } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';

export const DASH_MEDIA_SYMBOL = Symbol.for('@videojs/dash-media');

export class DashMedia
  extends HTMLVideoElementHost
  implements MediaEngineHost<dashjs.MediaPlayerClass, HTMLVideoElement>
{
  readonly [DASH_MEDIA_SYMBOL] = true;

  #engine: dashjs.MediaPlayerClass;
  #src = '';

  constructor() {
    super();
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
  }

  get engine() {
    return this.#engine;
  }

  get src() {
    return this.#src;
  }

  set src(src) {
    this.#src = src;
    this.#engine.attachSource(src);
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#engine.attachView(target);
  }

  detach() {
    super.detach();
    // dash.js types don't reflect null support, but null is valid for detaching
    this.#engine.attachView(null as unknown as HTMLVideoElement);
  }

  destroy() {
    this.detach();
    this.#engine.destroy();
  }
}
