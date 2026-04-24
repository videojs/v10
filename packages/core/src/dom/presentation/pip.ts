import { isFunction } from '@videojs/utils/predicate';
import type { WebKitVideoElement } from './types';

export function isPictureInPictureEnabled(): boolean {
  if (document.pictureInPictureEnabled) {
    const isSafari = /.*Version\/.*Safari\/.*/.test(navigator.userAgent);
    if (!isSafari) return true;
  }

  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitSetPresentationMode);
}
