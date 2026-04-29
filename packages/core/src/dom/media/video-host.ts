import { isFunction } from '@videojs/utils/predicate';
import type { Video, VideoEvents } from '../../core/media/types';
import type { WebKitDocument, WebKitPresentationMode, WebKitVideoElement } from '../presentation/types';
import { HTMLMediaElementHost } from './media-host';

export class HTMLVideoElementHost extends HTMLMediaElementHost<HTMLVideoElement, VideoEvents> implements Video {
  get poster() {
    return this.target?.poster ?? '';
  }

  set poster(value: string) {
    if (this.target) this.target.poster = value;
  }

  get webkitPresentationMode() {
    return (this.target as WebKitVideoElement | null)?.webkitPresentationMode;
  }

  get webkitSetPresentationMode(): ((mode: WebKitPresentationMode) => void) | undefined {
    const target = this.target as unknown as WebKitVideoElement | null;
    const fn = target?.webkitSetPresentationMode;
    return isFunction(fn) ? fn.bind(target) : undefined;
  }

  get isPictureInPicture(): boolean {
    return (
      (!!this.target && globalThis.document?.pictureInPictureElement === this.target) ||
      this.webkitPresentationMode === 'picture-in-picture'
    );
  }

  get isFullscreen(): boolean {
    if (!this.target) return false;
    if (this.webkitPresentationMode === 'fullscreen') return true;
    const doc = globalThis.document as WebKitDocument;
    return doc?.fullscreenElement === this.target || doc?.webkitFullscreenElement === this.target;
  }

  async requestPictureInPicture() {
    if (!this.target) return Promise.reject();
    return this.target.requestPictureInPicture();
  }

  async exitPictureInPicture() {
    if (!this.target) return Promise.reject();
    return globalThis.document?.exitPictureInPicture();
  }

  requestFullscreen() {
    if (!this.target) return Promise.reject();
    return this.target.requestFullscreen();
  }

  exitFullscreen() {
    if (!this.target) return Promise.reject();
    return globalThis.document?.exitFullscreen();
  }
}
