import { onEvent } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { Video, VideoEvents } from '../../core/media/types';
import type { WebKitDocument, WebKitVideoElement } from '../presentation/types';
import { HTMLMediaElementHost } from './media-host';

export class HTMLVideoElementHost extends HTMLMediaElementHost<HTMLVideoElement, VideoEvents> implements Video {
  #wasFullscreen = false;
  #wasPictureInPicture = false;

  get poster() {
    return this.target?.poster ?? '';
  }

  set poster(value: string) {
    if (this.target) this.target.poster = value;
  }

  override attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#wasFullscreen = this.isFullscreen;
    this.#wasPictureInPicture = this.isPictureInPicture;
    // Normalize WebKit-only events on the target into their standard
    // counterparts so consumers can listen to a single set of events:
    // - webkitpresentationmodechanged → fullscreenchange / enter|leavepictureinpicture
    // - webkitfullscreenchange → fullscreenchange
    target.addEventListener('webkitpresentationmodechanged', this.#handlePresentationChange);
    target.addEventListener('webkitfullscreenchange', this.#handlePresentationChange);
  }

  override detach() {
    this.target?.removeEventListener('webkitpresentationmodechanged', this.#handlePresentationChange);
    this.target?.removeEventListener('webkitfullscreenchange', this.#handlePresentationChange);
    super.detach();
  }

  #handlePresentationChange = () => {
    const isFullscreen = this.isFullscreen;
    if (isFullscreen !== this.#wasFullscreen) {
      this.#wasFullscreen = isFullscreen;
      // Match the native fullscreenchange event, which bubbles.
      this.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
    }

    const isPip = this.isPictureInPicture;
    if (isPip !== this.#wasPictureInPicture) {
      this.#wasPictureInPicture = isPip;
      this.dispatchEvent(new Event(isPip ? 'enterpictureinpicture' : 'leavepictureinpicture'));
    }
  };

  // -- Fullscreen --

  get isFullscreen() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;
    if (!video) return false;

    if (video.webkitDisplayingFullscreen && video.webkitPresentationMode === 'fullscreen') {
      return true;
    }

    const doc = document as WebKitDocument;
    const el = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    return el === video;
  }

  requestFullscreen() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;
    if (!video) return Promise.reject(new DOMException('Fullscreen not supported', 'NotSupportedError'));

    if (isFunction(video.webkitEnterFullscreen)) {
      video.webkitEnterFullscreen();
      return Promise.resolve();
    }

    if (isFunction(video.requestFullscreen)) {
      return video.requestFullscreen();
    }

    return Promise.reject(new DOMException('Fullscreen not supported', 'NotSupportedError'));
  }

  exitFullscreen() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;

    if (video?.webkitDisplayingFullscreen && isFunction(video.webkitExitFullscreen)) {
      video.webkitExitFullscreen();
      return Promise.resolve();
    }

    const doc = document as WebKitDocument;
    if (isFunction(doc.exitFullscreen)) {
      return doc.exitFullscreen();
    }

    if (isFunction(doc.webkitExitFullscreen)) {
      return doc.webkitExitFullscreen();
    }

    return Promise.resolve();
  }

  // -- Picture-in-Picture --

  get isPictureInPicture() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;
    if (!video) return false;

    if (document.pictureInPictureElement === video) {
      return true;
    }

    return video.webkitPresentationMode === 'picture-in-picture';
  }

  async requestPictureInPicture() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;

    if (video && this.isPictureInPicture) return;

    // WebKit's setPresentationMode is fire-and-forget — the transition is
    // async and signaled via webkitpresentationmodechanged (normalized to
    // enterpictureinpicture in #handlePresentationChange).
    if (video && isFunction(video.webkitSetPresentationMode)) {
      const event = onEvent(this, 'enterpictureinpicture');
      video.webkitSetPresentationMode('picture-in-picture');
      await event;
      return;
    }

    // Standard requestPictureInPicture resolves *after* the
    // enterpictureinpicture event has fired (per spec).
    if (video && isFunction(video.requestPictureInPicture)) {
      await video.requestPictureInPicture();
      return;
    }

    throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
  }

  async exitPictureInPicture() {
    const video = this.target as (HTMLVideoElement & WebKitVideoElement) | null;

    if (!this.isPictureInPicture) return;

    if (video?.webkitPresentationMode === 'picture-in-picture' && isFunction(video.webkitSetPresentationMode)) {
      const event = onEvent(this, 'leavepictureinpicture');
      video.webkitSetPresentationMode('inline');
      await event;
      return;
    }

    if (isFunction(document.exitPictureInPicture)) {
      await document.exitPictureInPicture();
    }
  }
}
