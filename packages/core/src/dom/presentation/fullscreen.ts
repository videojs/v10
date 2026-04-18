import { isFunction } from '@videojs/utils/predicate';
import { resolveHTMLMediaElement, resolveHTMLVideoElement } from '../media/predicate';
import type { Media } from '../media/types';
import { isWebKitDocument, isWebKitFullscreenElement, isWebKitVideoElement } from './webkit';

export function isDocumentFullscreenEnabled(): boolean {
  return document.fullscreenEnabled || (isWebKitDocument(document) && document.webkitFullscreenEnabled);
}

export function getDocumentFullscreenElement(): Element | null {
  if (document.fullscreenElement) {
    return document.fullscreenElement;
  }

  if (isWebKitDocument(document)) {
    return document.webkitFullscreenElement;
  }

  return null;
}

export function isFullscreenEnabled(media: Media): boolean {
  if (isDocumentFullscreenEnabled()) {
    return true;
  }

  const video = resolveHTMLVideoElement(media);
  if (!video) return false;

  if (isWebKitVideoElement(video) && video.webkitSupportsPresentationMode('fullscreen')) {
    return true;
  }

  return false;
}

export function isFullscreenElement(container: HTMLElement | null, media: Media): boolean {
  const video = resolveHTMLVideoElement(media);

  if (isWebKitVideoElement(video) && video.webkitPresentationMode === 'fullscreen') {
    return true;
  }

  const target = container ?? resolveHTMLMediaElement(media);

  if (getDocumentFullscreenElement() === target) return true;

  if (target instanceof Element) {
    try {
      return target.matches(':fullscreen');
    } catch {
      return false;
    }
  }

  return false;
}

export function requestFullscreen(container: HTMLElement | null, media: Media): Promise<void> {
  if (isDocumentFullscreenEnabled()) {
    if (container && isFunction(container.requestFullscreen)) {
      return container.requestFullscreen();
    }

    if (isWebKitFullscreenElement(container)) {
      return container.webkitRequestFullscreen();
    }
  }

  const target = resolveHTMLMediaElement(media);

  if (target && isFunction(target.requestFullscreen)) {
    return target.requestFullscreen();
  }

  if (isWebKitVideoElement(target)) {
    return Promise.resolve(target.webkitSetPresentationMode('fullscreen'));
  }

  throw new DOMException('Fullscreen not supported', 'NotSupportedError');
}

export function exitFullscreen(media: Media): Promise<void> {
  if (isFunction(document.exitFullscreen)) {
    return document.exitFullscreen();
  }

  if (isWebKitDocument(document) && isFunction(document.webkitExitFullscreen)) {
    return Promise.resolve(document.webkitExitFullscreen());
  }

  const target = media ? resolveHTMLMediaElement(media) : null;

  if (isWebKitVideoElement(target) && target.webkitPresentationMode === 'fullscreen') {
    return Promise.resolve(target.webkitSetPresentationMode('inline'));
  }

  return Promise.resolve();
}
