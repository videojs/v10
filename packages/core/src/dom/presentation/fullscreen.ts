import { isFunction } from '@videojs/utils/predicate';

import type { WebKitDocument, WebKitFullscreenElement, WebKitVideoElement } from './types';

/** Check if the Fullscreen API is supported on this platform. */
export function isFullscreenSupported(): boolean {
  const doc = document as WebKitDocument;

  // Standard API or WebKit prefix
  if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
    return true;
  }

  // iOS Safari: check for webkitSupportsFullscreen on a test video
  const video = document.createElement('video') as WebKitVideoElement;
  return video.webkitSupportsFullscreen === true;
}

/** Get the current fullscreen element from the document. */
export function getFullscreenElement(): Element | null {
  const doc = document as WebKitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Check if a specific element (or its media) is currently in fullscreen.
 *
 * Uses `:fullscreen` pseudo-class which works across Shadow DOM boundaries.
 */
export function isElementFullscreen(container: HTMLElement | null, media: HTMLMediaElement): boolean {
  const video = media as WebKitVideoElement;

  // iOS Safari video-only fullscreen
  if (video.webkitDisplayingFullscreen && video.webkitPresentationMode === 'fullscreen') {
    return true;
  }

  const target = container ?? media;

  // Direct match with fullscreen element
  if (getFullscreenElement() === target) return true;

  // Use :fullscreen pseudo-class (works in Shadow DOM)
  try {
    return target.matches(':fullscreen');
  } catch {
    return false;
  }
}

/**
 * Enter fullscreen mode.
 *
 * Tries container first (to show custom UI), falls back to media element
 * for platforms that only support video fullscreen (iOS Safari).
 */
export async function enterFullscreen(container: HTMLElement | null, media: HTMLMediaElement): Promise<void> {
  const video = media as WebKitVideoElement;

  // Try container first (standard and WebKit APIs)
  if (container) {
    const el = container as WebKitFullscreenElement;

    if (isFunction(el.requestFullscreen)) {
      return el.requestFullscreen();
    }

    if (isFunction(el.webkitRequestFullscreen)) {
      return el.webkitRequestFullscreen();
    }

    if (isFunction(el.webkitRequestFullScreen)) {
      return el.webkitRequestFullScreen();
    }
  }

  // Fall back to media element (iOS Safari)
  if (isFunction(video.webkitEnterFullscreen)) {
    video.webkitEnterFullscreen();
    return;
  }

  // Last resort: try media element with standard API
  if (isFunction(media.requestFullscreen)) {
    return media.requestFullscreen();
  }

  throw new DOMException('Fullscreen not supported', 'NotSupportedError');
}

/** Exit fullscreen mode. */
export async function exitFullscreen(): Promise<void> {
  const doc = document as WebKitDocument;
  const video = getFullscreenElement() as WebKitVideoElement | null;

  // Try standard API
  if (isFunction(doc.exitFullscreen)) {
    return doc.exitFullscreen();
  }

  // Try WebKit API
  if (isFunction(doc.webkitExitFullscreen)) {
    return doc.webkitExitFullscreen();
  }

  // Try older WebKit API
  if (isFunction(doc.webkitCancelFullScreen)) {
    return doc.webkitCancelFullScreen();
  }

  // iOS Safari video fullscreen
  if (video && isFunction(video.webkitExitFullscreen)) {
    video.webkitExitFullscreen();
    return;
  }

  // No-op if not in fullscreen (matches browser behavior)
}
