import type { Video, VideoEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './media-host';

export const VIDEO_ELEMENT_HOST_SYMBOL = Symbol.for('@videojs/video-element-host');

export class HTMLVideoElementHost extends HTMLMediaElementHost<HTMLVideoElement, VideoEvents> implements Video {
  readonly [VIDEO_ELEMENT_HOST_SYMBOL] = true;

  get poster() {
    return this.target?.poster ?? '';
  }

  set poster(value: string) {
    if (this.target) this.target.poster = value;
  }

  requestPictureInPicture() {
    return this.target?.requestPictureInPicture() ?? Promise.reject();
  }

  requestFullscreen() {
    return this.target?.requestFullscreen() ?? Promise.reject();
  }
}
