import type { VideoEvents } from '../../core/media/types';
import { HTMLVideoElementLayer } from './html-video-element-layer';

export class HTMLVideoElementHost<
  Engine = unknown,
  Target extends HTMLVideoElement = HTMLVideoElement,
> extends HTMLVideoElementLayer<Target, Engine, VideoEvents> {
  override get engine(): Engine | null {
    return super.engine;
  }
}
