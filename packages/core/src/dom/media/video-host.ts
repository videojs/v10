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
    return (this.target as unknown as WebKitVideoElement | null)?.webkitEnterFullscreen?.();
  }

  webkitExitFullscreen() {
    return (this.target as unknown as WebKitVideoElement | null)?.webkitExitFullscreen?.();
  }

  webkitSetPresentationMode(mode: WebKitPresentationMode) {
    return (this.target as unknown as WebKitVideoElement | null)?.webkitSetPresentationMode?.(mode);
  }

  get webkitDisplayingFullscreen() {
    return (this.target as unknown as WebKitVideoElement | null)?.webkitDisplayingFullscreen ?? false;
  }

  get webkitPresentationMode() {
    return (this.target as unknown as WebKitVideoElement | null)?.webkitPresentationMode ?? 'inline';
  }
}
