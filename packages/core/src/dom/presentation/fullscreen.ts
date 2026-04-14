import { isFunction } from '@videojs/utils/predicate';

import type { WebKitDocument, WebKitFullscreenElement, WebKitVideoElement } from './types';

export function isFullscreenEnabled(): boolean {
  const doc = document as WebKitDocument;

  if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
    return true;
  }

  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitEnterFullscreen);
}

export function getFullscreenElement(): Element | null {
  const doc = document as WebKitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenElement(container: HTMLElement | null, media: EventTarget): boolean {
  if (media instanceof HTMLMediaElement) {
    const video = media as WebKitVideoElement;
    if (video.webkitDisplayingFullscreen && video.webkitPresentationMode === 'fullscreen') {
      return true;
    }
  }

  const target = container ?? media;

  if (getFullscreenElement() === target) return true;

  if (target instanceof Element) {
    try {
      return target.matches(':fullscreen');
    } catch {
      return false;
    }
  }

  return false;
}

export async function requestFullscreen(container: HTMLElement | null, media: EventTarget): Promise<void> {
  const doc = document as WebKitDocument;

  if (container && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
    const el = container as WebKitFullscreenElement;

    if (isFunction(el.requestFullscreen)) {
      return el.requestFullscreen();
    }

    if (isFunction(el.webkitRequestFullscreen)) {
      return el.webkitRequestFullscreen();
    }
  }

  if (media instanceof HTMLMediaElement) {
    const video = media as WebKitVideoElement;
    if (isFunction(video.webkitEnterFullscreen)) {
      video.webkitEnterFullscreen();
      return;
    }

    if (isFunction(media.requestFullscreen)) {
      return media.requestFullscreen();
    }
  }

  throw new DOMException('Fullscreen not supported', 'NotSupportedError');
}

export async function exitFullscreen(media?: EventTarget): Promise<void> {
  const doc = document as WebKitDocument;

  if (media instanceof HTMLMediaElement) {
    const video = media as WebKitVideoElement;
    if (isFunction(video.webkitExitFullscreen) && video.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen();
      return;
    }
  }

  if (isFunction(doc.exitFullscreen)) {
    return doc.exitFullscreen();
  }

  if (isFunction(doc.webkitExitFullscreen)) {
    return doc.webkitExitFullscreen();
  }
}
