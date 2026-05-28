import type { Video, VideoEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './html-media-element-host';

export class HTMLVideoElementHost<Engine = unknown, Target extends HTMLVideoElement = HTMLVideoElement>
  extends HTMLMediaElementHost<Target, Engine, VideoEvents>
  implements Video<Engine> {}
