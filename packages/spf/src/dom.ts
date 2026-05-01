/**
 * DOM/Browser-specific SPF bindings
 *
 * This is a convenience aggregate of DOM-bound exports drawn from across
 * the package. The underlying pieces live alongside their DOM-free peers
 * in `behaviors/` (with `dom/` subdirs where applicable) and `media/dom/`.
 */

export { appendSegment } from './media/dom/mse/append-segment';
export { flushBuffer } from './media/dom/mse/buffer-flusher';
export { destroyVttResolver, resolveVttSegment } from './media/dom/text/resolve-vtt-segment';
export { loadSegments } from './playback/behaviors/dom/load-segments';
export { setupTextTrackActors } from './playback/behaviors/dom/setup-text-track-actors';
export type { CurrentTimeContext, CurrentTimeState } from './playback/behaviors/dom/track-current-time';
export { trackCurrentTime } from './playback/behaviors/dom/track-current-time';
export type {
  PlaybackInitiatedContext,
  PlaybackInitiatedState,
} from './playback/behaviors/dom/track-playback-initiated';
export { trackPlaybackInitiated } from './playback/behaviors/dom/track-playback-initiated';
export type { PlaybackRateContext, PlaybackRateState } from './playback/behaviors/dom/track-playback-rate';
export { trackPlaybackRate } from './playback/behaviors/dom/track-playback-rate';
