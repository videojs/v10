import { isFunction } from '@videojs/utils/predicate';

import type { WebKitVideoElement } from './types';

/**
 * Check if Picture-in-Picture is supported on this platform.
 *
 * Note: Safari PWAs don't support PiP even though the API exists.
 */
export function isPiPSupported(): boolean {
  // Check standard PiP API
  if (document.pictureInPictureEnabled) {
    // Safari PWAs have the API but it doesn't work
    const isSafari = /.*Version\/.*Safari\/.*/.test(navigator.userAgent);
    const isPWA = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
    return !isSafari || !isPWA;
  }

  // Check iOS Safari WebKit presentation mode
  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitSetPresentationMode);
}

/**
 * Check if Picture-in-Picture is currently active for a media element.
 */
export function isPiPActive(media: HTMLMediaElement): boolean {
  // Standard PiP API
  if (document.pictureInPictureElement === media) {
    return true;
  }

  // iOS Safari WebKit presentation mode
  const video = media as WebKitVideoElement;
  return video.webkitPresentationMode === 'picture-in-picture';
}

/**
 * Enter Picture-in-Picture mode.
 *
 * Uses standard API where available, falls back to iOS Safari's
 * WebKit presentation mode.
 */
export async function enterPiP(media: HTMLMediaElement): Promise<void> {
  const video = media as HTMLVideoElement & WebKitVideoElement;

  // Standard PiP API (only available on HTMLVideoElement)
  if (isFunction(video.requestPictureInPicture)) {
    await video.requestPictureInPicture();
    return;
  }

  // iOS Safari WebKit presentation mode
  if (isFunction(video.webkitSetPresentationMode)) {
    video.webkitSetPresentationMode('picture-in-picture');
    return;
  }

  throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
}

/**
 * Exit Picture-in-Picture mode.
 *
 * Uses standard API where available, falls back to iOS Safari's
 * WebKit presentation mode.
 */
export async function exitPiP(media?: HTMLMediaElement): Promise<void> {
  // Standard PiP API
  if (document.pictureInPictureElement && isFunction(document.exitPictureInPicture)) {
    await document.exitPictureInPicture();
    return;
  }

  // iOS Safari WebKit presentation mode
  if (media) {
    const video = media as WebKitVideoElement;
    if (video.webkitPresentationMode === 'picture-in-picture' && isFunction(video.webkitSetPresentationMode)) {
      video.webkitSetPresentationMode('inline');
      return;
    }
  }

  // No-op if not in PiP (matches browser behavior)
}
