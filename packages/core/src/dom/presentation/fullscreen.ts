import { isFunction } from '@videojs/utils/predicate';

import type { WebKitDocument, WebKitFullscreenElement, WebKitVideoElement } from './types';

/** Check if the Fullscreen API is supported on this platform. */
export function isFullscreenEnabled(): boolean {
  const doc = document as WebKitDocument;

  // Standard API or WebKit prefix
  if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
    return true;
  }

  // iOS Safari: check for webkitEnterFullscreen on a test video.
  // Unlike webkitSupportsFullscreen, this is available on detached elements.
  const video = document.createElement('video') as WebKitVideoElement;
  return isFunction(video.webkitEnterFullscreen);
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
export function isFullscreenElement(container: HTMLElement | null, media: HTMLMediaElement): boolean {
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
 * Request fullscreen mode.
 *
 * Tries container first (to show custom UI), falls back to media element
 * for platforms that only support video fullscreen (iOS Safari).
 */
export async function requestFullscreen(container: HTMLElement | null, media: HTMLMediaElement): Promise<void> {
  const doc = document as WebKitDocument;
  const video = media as WebKitVideoElement;

  // Try container first, but only if the platform supports element-level fullscreen.
  // iOS Safari has requestFullscreen on Element.prototype but it silently fails.
  if (container && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
    const el = container as WebKitFullscreenElement;

    if (isFunction(el.requestFullscreen)) {
      return el.requestFullscreen();
    }

    if (isFunction(el.webkitRequestFullscreen)) {
      return el.webkitRequestFullscreen();
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
export async function exitFullscreen(media?: HTMLMediaElement): Promise<void> {
  const doc = document as WebKitDocument;

  // iOS Safari: use video element WebKit API first when it's actively in fullscreen.
  if (media) {
    const video = media as WebKitVideoElement;
    if (isFunction(video.webkitExitFullscreen) && video.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen();
      return;
    }
  }

  // Standard API
  if (isFunction(doc.exitFullscreen)) {
    return doc.exitFullscreen();
  }

  // WebKit document API (desktop Safari)
  if (isFunction(doc.webkitExitFullscreen)) {
    return doc.webkitExitFullscreen();
  }

  // No-op if not in fullscreen (matches browser behavior)
}
