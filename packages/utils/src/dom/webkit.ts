/** WebKit-only addition to HTMLMediaElement exposing the active AirPlay flag. */
export interface WebKitAirPlayMedia extends HTMLMediaElement {
  readonly webkitCurrentPlaybackTargetIsWireless: boolean;
}

/** WebKit presentation mode values for iOS Safari. */
export type WebKitPresentationMode = 'inline' | 'fullscreen' | 'picture-in-picture';

/** Extended HTMLVideoElement with WebKit vendor APIs. */
export interface WebKitVideoElement extends HTMLVideoElement {
  /** Current WebKit presentation mode (iOS Safari). */
  webkitPresentationMode?: WebKitPresentationMode;
  /** Set WebKit presentation mode (iOS Safari). */
  webkitSetPresentationMode?: (mode: WebKitPresentationMode) => void;
}

/** Extended Element with WebKit fullscreen vendor API. */
export interface WebKitFullscreenElement extends Element {
  /** Request fullscreen using WebKit API (Safari). */
  webkitRequestFullscreen?: () => Promise<void>;
}

/** Extended Document with WebKit fullscreen vendor APIs. */
export interface WebKitDocument extends Document {
  /** Current fullscreen element (WebKit). */
  webkitFullscreenElement?: Element | null;
  /** Whether fullscreen is enabled (WebKit). */
  webkitFullscreenEnabled?: boolean;
  /** Exit fullscreen (WebKit). */
  webkitExitFullscreen?: () => Promise<void>;
}

/** WebKit-specific AirPlay availability event payload (not in lib.dom). */
export type WebkitAvailabilityEvent = Event & { availability: 'available' | 'not-available' };

/** Whether WebKit's AirPlay APIs are present in this realm (Safari macOS/iOS). */
export function supportsWebKitAirPlay(): boolean {
  return 'WebKitPlaybackTargetAvailabilityEvent' in globalThis;
}

/** Whether `media` exposes WebKit's AirPlay APIs. */
export function isWebKitAirPlayCapable(media: EventTarget): media is WebKitAirPlayMedia {
  return supportsWebKitAirPlay() && 'webkitCurrentPlaybackTargetIsWireless' in media;
}
