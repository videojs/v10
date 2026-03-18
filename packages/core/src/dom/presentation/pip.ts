import { isFunction } from '@videojs/utils/predicate';

import type { WebKitVideoElement } from './types';

type MediaWithTarget = HTMLMediaElement & {
  target?: unknown;
};

function resolveMediaTarget(media: HTMLMediaElement): HTMLMediaElement {
  const target = (media as MediaWithTarget).target;
  return target instanceof HTMLMediaElement ? target : media;
}

/**
 * Check if Picture-in-Picture is supported on this platform.
 *
 * Note: Safari PWAs don't support PiP even though the API exists.
 */
export function isPictureInPictureEnabled(): boolean {
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
export function isPictureInPictureElement(media: HTMLMediaElement): boolean {
  const target = resolveMediaTarget(media);

  // Standard PiP API
  if (document.pictureInPictureElement === target) {
    return true;
  }

  // iOS Safari WebKit presentation mode
  const video = target as WebKitVideoElement;
  return video.webkitPresentationMode === 'picture-in-picture';
}

/**
 * Request Picture-in-Picture mode.
 *
 * Uses standard API where available, falls back to iOS Safari's
 * WebKit presentation mode.
 */
export async function requestPictureInPicture(media: HTMLMediaElement): Promise<void> {
  const target = resolveMediaTarget(media);
  const video = target as HTMLVideoElement & WebKitVideoElement;

  // iOS Safari: use WebKit presentation mode directly.
  // The standard API may exist on the prototype but silently fail.
  if (isFunction(video.webkitSetPresentationMode)) {
    video.webkitSetPresentationMode('picture-in-picture');
    return;
  }

  // Standard PiP API (only available on HTMLVideoElement)
  if (isFunction(video.requestPictureInPicture)) {
    await video.requestPictureInPicture();
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
export async function exitPictureInPicture(media?: HTMLMediaElement): Promise<void> {
  // iOS Safari: use WebKit presentation mode directly when active.
  if (media) {
    const target = resolveMediaTarget(media);
    const video = target as WebKitVideoElement;
    if (isFunction(video.webkitSetPresentationMode) && video.webkitPresentationMode === 'picture-in-picture') {
      video.webkitSetPresentationMode('inline');
      return;
    }
  }

  // Standard PiP API
  if (isFunction(document.exitPictureInPicture)) {
    return document.exitPictureInPicture();
  }

  // No-op if not in PiP (matches browser behavior)
}
