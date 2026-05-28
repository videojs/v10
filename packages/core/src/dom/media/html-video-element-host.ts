import type { Video, VideoEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './html-media-element-host';

export class HTMLVideoElementHost<Target extends HTMLVideoElement = HTMLVideoElement>
  extends HTMLMediaElementHost<Target, VideoEvents>
  implements Video {}
