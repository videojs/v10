/** WebKit-only addition to HTMLMediaElement exposing the active AirPlay flag. */
export interface WebKitAirPlayMedia extends HTMLMediaElement {
  readonly webkitCurrentPlaybackTargetIsWireless: boolean;
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
