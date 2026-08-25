import type { WebKitDocument, WebKitFullscreenElement, WebKitVideoElement } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';

export function isFullscreenEnabled() {
  const doc =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ document as WebKitDocument;
  if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
    return true;
  }

  const video =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ document.createElement(
      'video'
    ) as WebKitVideoElement;
  return isFunction(video.webkitSetPresentationMode);
}

export function getFullscreenElement() {
  const doc =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ document as WebKitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function matchesFullscreen(element: EventTarget | null) {
  if (!(element instanceof Element)) return false;
  try {
    return element.matches(':fullscreen');
  } catch {
    return false;
  }
}

export function isFullscreen(container: HTMLElement | null, media: EventTarget) {
  const webkitVideo =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ media as WebKitVideoElement;
  if (webkitVideo.webkitPresentationMode === 'fullscreen') {
    return true;
  }

  const fullscreenElement = getFullscreenElement();
  if (fullscreenElement && (fullscreenElement === container || fullscreenElement === media)) {
    return true;
  }

  // `:fullscreen` matches the fullscreen element AND its ancestors (across
  // shadow boundaries), so this covers cases where fullscreen was requested
  // on a descendant — e.g. the inner `<video>` via native controls — rather
  // than the container itself.
  if (matchesFullscreen(container) || matchesFullscreen(media)) {
    return true;
  }

  // isFullscreen is a non-standard property that is set by the video host
  // and checks internally if the video host target is the fullscreen element.
  return 'isFullscreen' in media && media.isFullscreen === true;
}

export async function requestFullscreen(container: HTMLElement | null, media: EventTarget) {
  const doc =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ document as WebKitDocument;

  if (container && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
    const el =
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ container as WebKitFullscreenElement;

    if (isFunction(el.requestFullscreen)) {
      return el.requestFullscreen();
    }

    if (isFunction(el.webkitRequestFullscreen)) {
      return el.webkitRequestFullscreen();
    }
  }

  const webkitVideo =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ media as WebKitVideoElement;
  if (isFunction(webkitVideo.webkitSetPresentationMode)) {
    webkitVideo.webkitSetPresentationMode('fullscreen');
    return;
  }

  if ('requestFullscreen' in media && isFunction(media.requestFullscreen)) {
    return media.requestFullscreen();
  }
}

export async function exitFullscreen(media: EventTarget) {
  const doc =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ document as WebKitDocument;

  const webkitVideo =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ media as WebKitVideoElement;
  if (webkitVideo.webkitPresentationMode === 'fullscreen' && isFunction(webkitVideo.webkitSetPresentationMode)) {
    webkitVideo.webkitSetPresentationMode('inline');
    return;
  }

  if (isFunction(doc.exitFullscreen)) {
    return doc.exitFullscreen();
  }

  if (isFunction(doc.webkitExitFullscreen)) {
    return doc.webkitExitFullscreen();
  }

  if ('exitFullscreen' in media && isFunction(media.exitFullscreen)) {
    return media.exitFullscreen();
  }
}
