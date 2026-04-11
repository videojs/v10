import { isFunction } from '@videojs/utils/predicate';

import type { WebKitVideoElement } from './types';

function resolveMediaTarget(media: EventTarget): EventTarget {
  const target = (media as EventTarget & { target?: unknown }).target;
  return target instanceof HTMLMediaElement ? target : media;
}

export function isPictureInPictureEnabled(): boolean {
  if (document.pictureInPictureEnabled) {
    const isSafari = /.*Version\/.*Safari\/.*/.test(navigator.userAgent);
    const isPWA = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
    return !isSafari || !isPWA;
  }

  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitSetPresentationMode);
}

export function isPictureInPictureElement(media: EventTarget): boolean {
  const target = resolveMediaTarget(media);

  if (document.pictureInPictureElement === target) {
    return true;
  }

  if (target instanceof HTMLVideoElement) {
    const video = target as WebKitVideoElement;
    return video.webkitPresentationMode === 'picture-in-picture';
  }

  return false;
}

export async function requestPictureInPicture(media: EventTarget): Promise<void> {
  const target = resolveMediaTarget(media);

  if (!(target instanceof HTMLVideoElement)) {
    throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
  }

  const video = target as HTMLVideoElement & WebKitVideoElement;

  if (isFunction(video.webkitSetPresentationMode)) {
    video.webkitSetPresentationMode('picture-in-picture');
    return;
  }

  if (isFunction(video.requestPictureInPicture)) {
    await video.requestPictureInPicture();
    return;
  }

  throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
}

export async function exitPictureInPicture(media?: EventTarget): Promise<void> {
  if (media) {
    const target = resolveMediaTarget(media);
    if (target instanceof HTMLVideoElement) {
      const video = target as WebKitVideoElement;
      if (isFunction(video.webkitSetPresentationMode) && video.webkitPresentationMode === 'picture-in-picture') {
        video.webkitSetPresentationMode('inline');
        return;
      }
    }
  }

  if (isFunction(document.exitPictureInPicture)) {
    return document.exitPictureInPicture();
  }
}
