/** WebKit-only addition to HTMLMediaElement exposing the active AirPlay flag. */
export interface WebKitAirplayMedia extends HTMLMediaElement {
  readonly webkitCurrentPlaybackTargetIsWireless: boolean;
}

/** WebKit-specific AirPlay availability event payload (not in lib.dom). */
export type WebkitAvailabilityEvent = Event & { availability: 'available' | 'not-available' };

/** Whether WebKit's AirPlay APIs are present in this realm (Safari macOS/iOS). */
export function supportsWebKitAirplay(): boolean {
  return 'WebKitPlaybackTargetAvailabilityEvent' in globalThis;
}

/** Whether `media` exposes WebKit's AirPlay APIs. */
export function isWebKitAirplayCapable(media: EventTarget): media is WebKitAirplayMedia {
  return supportsWebKitAirplay() && 'webkitCurrentPlaybackTargetIsWireless' in media;
}
