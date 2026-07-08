import * as dashjs from 'dashjs';
import { MediaTracksMixin } from '../../../core/media/media-tracks';
import type { MediaEngineHost } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';

export interface DashMediaProps {
  src: string;
}

export const dashMediaDefaultProps: DashMediaProps = {
  src: '',
};

const DashMediaBase = MediaTracksMixin(HTMLVideoElementHost);

export class DashMedia
  extends DashMediaBase
  implements MediaEngineHost<dashjs.MediaPlayerClass, HTMLVideoElement>, DashMediaProps
{
  #engine: dashjs.MediaPlayerClass;
  #src = dashMediaDefaultProps.src;

  constructor() {
    super();
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
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
    super.destroy();
  }

  /**
   * Underlying playback engine — the dash.js `MediaPlayerClass` instance. An
   * advanced escape hatch for direct engine access; normal playback is driven
   * through this element's own properties and methods.
   */
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
}
