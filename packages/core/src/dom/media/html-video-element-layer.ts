import { isFunction } from '@videojs/utils/predicate';
import type { EventLike, Video, VideoEvents } from '../../core/media/types';
import type { WebKitPresentationMode, WebKitVideoElement } from '../presentation/types';
import { HTMLMediaElementLayer } from './html-media-element-layer';

export abstract class HTMLVideoElementLayer<
  Target extends HTMLVideoElement = HTMLVideoElement,
  Engine = unknown,
  Events extends { [K in keyof Events]: EventLike } = VideoEvents,
  Next extends Video = Video,
> extends HTMLMediaElementLayer<Target, Engine, Events, Next> {
  // -- Video --

  get poster() {
    return this.next?.poster ?? '';
  }

  set poster(value: string) {
    if (this.next) this.next.poster = value;
  }

  get webkitPresentationMode() {
    return (this.next as WebKitVideoElement | null)?.webkitPresentationMode;
  }

  get webkitSetPresentationMode(): ((mode: WebKitPresentationMode) => void) | undefined {
    const fn = (this.next as WebKitVideoElement | null)?.webkitSetPresentationMode;
    return isFunction(fn) ? fn.bind(this.next) : undefined;
  }

  get isPictureInPicture(): boolean {
    const { target } = this;
    return (
      (!!target && globalThis.document?.pictureInPictureElement === target) ||
      this.webkitPresentationMode === 'picture-in-picture'
    );
  }

  get isFullscreen(): boolean {
    const { target } = this;
    if (!target) return false;
    if (this.webkitPresentationMode === 'fullscreen') return true;
    const doc = globalThis.document;
    if (!doc) return false;
    return (
      doc.fullscreenElement === target || ('webkitFullscreenElement' in doc && doc.webkitFullscreenElement === target)
    );
  }

  async requestPictureInPicture() {
    if (!this.next) return Promise.reject();
    return this.next.requestPictureInPicture();
  }

  async exitPictureInPicture() {
    return globalThis.document?.exitPictureInPicture();
  }

  requestFullscreen() {
    if (!this.next) return Promise.reject();
    return this.next.requestFullscreen();
  }

  exitFullscreen() {
    return globalThis.document?.exitFullscreen();
  }
}
