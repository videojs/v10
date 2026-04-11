import type { Video, VideoEvents } from '../../core/media/types';
import type { WebKitPresentationMode, WebKitVideoElement } from '../presentation/types';
import { HTMLMediaElementHost } from './media-host';

export class HTMLVideoElementHost extends HTMLMediaElementHost<HTMLVideoElement, VideoEvents> implements Video {
  requestPictureInPicture() {
    return this.target?.requestPictureInPicture() ?? Promise.reject();
  }

  requestFullscreen() {
    return this.target?.requestFullscreen() ?? Promise.reject();
  }

  webkitEnterFullscreen() {
    return (this.target as unknown as WebKitVideoElement).webkitEnterFullscreen?.();
  }

  webkitExitFullscreen() {
    return (this.target as unknown as WebKitVideoElement).webkitExitFullscreen?.();
  }

  webkitSetPresentationMode(mode: WebKitPresentationMode) {
    return (this.target as unknown as WebKitVideoElement).webkitSetPresentationMode?.(mode);
  }

  get webkitDisplayingFullscreen() {
    return (this.target as unknown as WebKitVideoElement).webkitDisplayingFullscreen ?? false;
  }

  get webkitPresentationMode() {
    return (this.target as unknown as WebKitVideoElement).webkitPresentationMode ?? 'inline';
  }
}
