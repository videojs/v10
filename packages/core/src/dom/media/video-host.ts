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
    return typeof fn === 'function' ? fn.bind(target) : undefined;
  }

  get isPictureInPicture(): boolean {
    return (
      (!!this.target && document.pictureInPictureElement === this.target) ||
      this.webkitPresentationMode === 'picture-in-picture'
    );
  }

  get isFullscreen(): boolean {
    if (this.webkitPresentationMode === 'fullscreen') return true;
    if (!this.target) return false;
    const doc = document as WebKitDocument;
    return doc.fullscreenElement === this.target || doc.webkitFullscreenElement === this.target;
  }

  async requestPictureInPicture(): Promise<void> {
    if (!this.target) return Promise.reject();
    await this.target.requestPictureInPicture();
  }

  async exitPictureInPicture(): Promise<void> {
    if (document.pictureInPictureElement === this.target) {
      await document.exitPictureInPicture();
    }
  }

  requestFullscreen(): Promise<void> {
    return this.target?.requestFullscreen() ?? Promise.reject();
  }

  exitFullscreen(): Promise<void> {
    return document.exitFullscreen();
  }
}
