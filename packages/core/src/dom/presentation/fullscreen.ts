import { isFunction } from '@videojs/utils/predicate';

import type { MediaFullscreenCapability } from '../../core/media/types';
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

export function isFullscreenElement(container: HTMLElement | null, media: MediaFullscreenCapability) {
  if (media.isFullscreen) return true;

  if (container && getFullscreenElement() === container) return true;

  if (container) {
    try {
      return container.matches(':fullscreen');
    } catch {
      return false;
    }
  }

  return false;
}

export async function requestFullscreen(container: HTMLElement | null, media: MediaFullscreenCapability) {
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

  return media.requestFullscreen();
}

export async function exitFullscreen(media?: MediaFullscreenCapability) {
  // If the media element is in fullscreen (including WebKit element-level
  // fullscreen on iOS Safari), delegate to the media.
  if (media?.isFullscreen) {
    return media.exitFullscreen();
  }

  // Otherwise, exit whatever is currently fullscreen at the document level.
  const doc = document as WebKitDocument;
  if (isFunction(doc.exitFullscreen)) {
    return doc.exitFullscreen();
  }

  if (isFunction(doc.webkitExitFullscreen)) {
    return doc.webkitExitFullscreen();
  }
}
