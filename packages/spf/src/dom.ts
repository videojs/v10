/**
 * DOM/Browser-specific SPF bindings
 *
 * This is a convenience aggregate of DOM-bound exports drawn from across
 * the package. The underlying pieces live alongside their DOM-free peers
 * in `behaviors/` (with `dom/` subdirs where applicable) and `media/dom/`.
 */

export { loadSegments } from './behaviors/dom/load-segments';
export { provideTextTrackActors } from './behaviors/dom/provide-text-track-actors';
export type { CurrentTimeOwners, CurrentTimeState } from './behaviors/dom/track-current-time';
export { trackCurrentTime } from './behaviors/dom/track-current-time';
export type { PlaybackInitiatedOwners, PlaybackInitiatedState } from './behaviors/dom/track-playback-initiated';
export { trackPlaybackInitiated } from './behaviors/dom/track-playback-initiated';
export type { PlaybackRateOwners, PlaybackRateState } from './behaviors/dom/track-playback-rate';
export { trackPlaybackRate } from './behaviors/dom/track-playback-rate';
export { appendSegment } from './media/dom/mse/append-segment';
export { flushBuffer } from './media/dom/mse/buffer-flusher';
export { destroyVttResolver, resolveVttSegment } from './media/dom/text/resolve-vtt-segment';
