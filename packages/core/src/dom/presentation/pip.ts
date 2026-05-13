import { isFunction } from '@videojs/utils/predicate';
import type { MediaPictureInPictureCapability } from '../../core/media/types';
import type { WebKitVideoElement } from './types';

export function isPictureInPictureEnabled(media?: EventTarget) {
  if (media && 'isPipCapable' in media && (media as { isPipCapable: boolean }).isPipCapable === false) return false;
  if (document.pictureInPictureEnabled) {
    const isSafari = /.*Version\/.*Safari\/.*/.test(navigator.userAgent);
    const isPWA = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
    return !isSafari || !isPWA;
  }

  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitSetPresentationMode);
}

export function isPictureInPicture(media: EventTarget) {
  const webkitVideo = media as WebKitVideoElement;
  if (webkitVideo.webkitPresentationMode === 'picture-in-picture') {
    return true;
  }

  if (document.pictureInPictureElement === media) {
    return true;
  }

  // isPictureInPicture is a non-standard property that is set by the video host
  // and checks internally if the video host target is the picture-in-picture element.
  const video = media as unknown as MediaPictureInPictureCapability;
  return video.isPictureInPicture ?? false;
}

export async function requestPictureInPicture(media: EventTarget) {
  const webkitVideo = media as WebKitVideoElement;
  if (isFunction(webkitVideo.webkitSetPresentationMode)) {
    webkitVideo.webkitSetPresentationMode('picture-in-picture');
    return;
  }

  const video = media as unknown as MediaPictureInPictureCapability;
  if (isFunction(video.requestPictureInPicture)) {
    return video.requestPictureInPicture() as Promise<void>;
  }
}

export async function exitPictureInPicture(media: EventTarget) {
  const webkitVideo = media as WebKitVideoElement;
  if (
    webkitVideo.webkitPresentationMode === 'picture-in-picture' &&
    isFunction(webkitVideo.webkitSetPresentationMode)
  ) {
    webkitVideo.webkitSetPresentationMode('inline');
    return;
  }

  // Check the media's own method first — iframe-based providers (e.g. Vimeo)
  // manage PiP inside their own document, so document.exitPictureInPicture()
  // on the parent page would fail with InvalidStateError.
  const video = media as unknown as MediaPictureInPictureCapability;
  if (isFunction(video.exitPictureInPicture)) {
    return video.exitPictureInPicture() as Promise<void>;
  }

  if (isFunction(document.exitPictureInPicture)) {
    return document.exitPictureInPicture();
  }
}
