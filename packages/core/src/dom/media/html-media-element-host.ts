import type { EventLike, VideoEvents } from '../../core/media/types';
import { HTMLMediaElementLayer } from './html-media-element-layer';

export class HTMLMediaElementHost<
  Target extends HTMLMediaElement = HTMLMediaElement,
  Engine = unknown,
  Events extends { [K in keyof Events]: EventLike } = VideoEvents,
> extends HTMLMediaElementLayer<Target, Engine, Events> {
  override get engine(): Engine | null {
    return super.engine;
  }
}
