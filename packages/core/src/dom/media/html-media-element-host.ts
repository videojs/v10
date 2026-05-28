import type { EventLike, VideoEvents } from '../../core/media/types';
import { HTMLMediaElementLayer } from './html-media-element-layer';

export class HTMLMediaElementHost<
  Target extends HTMLMediaElement,
  Events extends { [K in keyof Events]: EventLike } = VideoEvents,
> extends HTMLMediaElementLayer<Target, Events> {}
