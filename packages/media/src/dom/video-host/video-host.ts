import type { WebKitDocument, WebKitPresentationMode, WebKitVideoElement } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';

import type { Video, VideoEvents, VideoTargetLike } from '../../core/types';
import { HTMLMediaElementHost, type HTMLMediaTargetLike, mediaPropsFor } from '../media-host';

export interface HTMLVideoTargetLike extends VideoTargetLike, HTMLMediaTargetLike {}

const videoProps = mediaPropsFor<HTMLVideoTargetLike>();

export class HTMLVideoElementHost extends HTMLMediaElementHost<HTMLVideoTargetLike, VideoEvents> implements Video {
  get poster() {
    return videoProps.get(this, 'poster') ?? '';
  }

  set poster(value: string) {
    videoProps.set(this, 'poster', value);
  }

  get playsInline() {
    return videoProps.get(this, 'playsInline') ?? false;
  }

  set playsInline(value: boolean) {
    videoProps.set(this, 'playsInline', value);
  }

  get videoWidth() {
    return videoProps.get(this, 'videoWidth') ?? 0;
  }

  get videoHeight() {
    return videoProps.get(this, 'videoHeight') ?? 0;
  }

  get disablePictureInPicture() {
    return videoProps.get(this, 'disablePictureInPicture') ?? false;
  }

  set disablePictureInPicture(value: boolean) {
    videoProps.set(this, 'disablePictureInPicture', value);
  }

  get webkitCurrentPlaybackTargetIsWireless() {
    return (this.target as WebKitVideoElement | null)?.webkitCurrentPlaybackTargetIsWireless;
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
    const el = this.target as HTMLVideoElement | null;

    return (
      (!!el && globalThis.document?.pictureInPictureElement === el) ||
      this.webkitPresentationMode === 'picture-in-picture'
    );
  }

  get isFullscreen(): boolean {
    const el = this.target as HTMLVideoElement | null;
    if (!el) return false;

    if (this.webkitPresentationMode === 'fullscreen') return true;

    const doc = globalThis.document as WebKitDocument;

    return doc?.fullscreenElement === el || doc?.webkitFullscreenElement === el;
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
