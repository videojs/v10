import * as dashjs from 'dashjs';
import type { MediaEngineHost } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';

/** Configuration props for {@link DashMedia}. */
export interface DashMediaProps {
  /** Source URL. */
  src: string;
}

/** Defaults for {@link DashMediaProps}. */
export const dashMediaDefaultProps: DashMediaProps = {
  src: '',
};

/** Media adapter that loads MPEG-DASH via dash.js. */
export class DashMedia
  extends HTMLVideoElementHost
  implements MediaEngineHost<dashjs.MediaPlayerClass, HTMLVideoElement>, DashMediaProps
{
  #engine: dashjs.MediaPlayerClass;
  #src = dashMediaDefaultProps.src;

  constructor() {
    super();
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
  }

  /** Active dash.js MediaPlayer instance. */
  get engine() {
    return this.#engine;
  }

  /** Source URL. Assignment attaches it to the engine. */
  get src() {
    return this.#src;
  }

  set src(src) {
    this.#src = src;
    this.#engine.attachSource(src);
  }

  /** Attach the engine to a `<video>` element. */
  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#engine.attachView(target);
  }

  /** Detach from the current `<video>` element. */
  detach() {
    super.detach();
    // dash.js types don't reflect null support, but null is valid for detaching
    this.#engine.attachView(null as unknown as HTMLVideoElement);
  }

  /** Detach and destroy the engine. */
  destroy() {
    this.detach();
    this.#engine.destroy();
  }
}
