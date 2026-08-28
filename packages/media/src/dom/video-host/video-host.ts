import type { WebKitDocument, WebKitPresentationMode, WebKitVideoElement } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import type { Video, VideoEvents, VideoTargetLike } from '../../core/types';
import {
  createMediaHost,
  HTMLMediaElementHost,
  type HTMLMediaTargetLike,
  pictureInPictureCapability,
  playsInlineCapability,
  posterCapability,
  videoDimensionsCapability,
} from '../media-host';

export interface HTMLVideoTargetLike extends VideoTargetLike, HTMLMediaTargetLike {}

/** What a video adds to {@link htmlMediaElementCapabilities}. */
export const htmlVideoElementCapabilities = [
  posterCapability,
  playsInlineCapability,
  videoDimensionsCapability,
  pictureInPictureCapability,
] as const;

// The media host is generic, and a value cannot carry type arguments into a
// composition, so the video parameterization is stated here instead.
const HTMLVideoElementHostBase = createMediaHost(
  htmlVideoElementCapabilities,
  HTMLMediaElementHost as Constructor<HTMLMediaElementHost<HTMLVideoTargetLike, VideoEvents>>
);

/**
 * A host forwarding the full `HTMLVideoElement` surface.
 *
 * Presentation modes stay in the class body: entering and leaving fullscreen or picture-in-picture runs against
 * `document` rather than the media, so there is no property to forward.
 */
export class HTMLVideoElementHost extends HTMLVideoElementHostBase implements Video {
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
