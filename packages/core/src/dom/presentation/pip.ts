import { isFunction } from '@videojs/utils/predicate';
import type { MediaPictureInPictureCapability } from '../../core/media/types';
import type { WebKitVideoElement } from './types';

export function isPictureInPictureEnabled() {
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
    return video.requestPictureInPicture();
  }

  throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
}

export async function exitPictureInPicture(media: EventTarget) {
  const webkitVideo = media as WebKitVideoElement;
  if (isFunction(webkitVideo.webkitSetPresentationMode)) {
    webkitVideo.webkitSetPresentationMode('inline');
    return;
  }

  if (isFunction(document.exitPictureInPicture)) {
    return document.exitPictureInPicture();
  }

  const video = media as unknown as MediaPictureInPictureCapability;
  if (isFunction(video.exitPictureInPicture)) {
    return video.exitPictureInPicture();
  }

  throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
}
