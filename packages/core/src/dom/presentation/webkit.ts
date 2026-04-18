import { isObject } from '@videojs/utils/predicate';

/** WebKit presentation mode values for iOS Safari. */
export type WebKitPresentationMode = 'inline' | 'fullscreen' | 'picture-in-picture';

/** Extended HTMLVideoElement with WebKit vendor APIs. */
export interface WebKitVideoElement extends HTMLVideoElement {
  /** Current WebKit presentation mode (iOS Safari). */
  readonly webkitPresentationMode: WebKitPresentationMode;
  /** Set WebKit presentation mode (iOS Safari). */
  webkitSetPresentationMode: (mode: WebKitPresentationMode) => void;
  /** Check if a WebKit presentation mode is supported (iOS Safari). */
  webkitSupportsPresentationMode: (mode: WebKitPresentationMode) => boolean;
}

/** Extended Element with WebKit fullscreen vendor API. */
export interface WebKitFullscreenElement extends Element {
  /** Request fullscreen using WebKit API (Safari). */
  webkitRequestFullscreen: () => Promise<void>;
}

export function isWebKitFullscreenElement(value: unknown): value is WebKitFullscreenElement {
  return isObject(value) && 'webkitRequestFullscreen' in value;
}

/** Extended Document with WebKit fullscreen vendor APIs. */
export interface WebKitDocument extends Document {
  /** Current fullscreen element (WebKit). */
  readonly webkitFullscreenElement: Element | null;
  /** Whether fullscreen is enabled (WebKit). */
  readonly webkitFullscreenEnabled: boolean;
  /** Exit fullscreen (WebKit). */
  readonly webkitExitFullscreen?: () => Promise<void>;
}

export function isWebKitDocument(value: unknown): value is WebKitDocument {
  return isObject(value) && 'webkitFullscreenEnabled' in value;
}

export function isWebKitVideoElement(value: unknown): value is WebKitVideoElement {
  return isObject(value) && 'webkitSetPresentationMode' in value;
}
