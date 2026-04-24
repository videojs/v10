/**
 * DOM/Browser-specific SPF bindings
 */

export { loadSegments } from './behaviors/load-segments';
export { provideTextTrackActors } from './behaviors/provide-text-track-actors';
export type { CurrentTimeOwners, CurrentTimeState } from './behaviors/track-current-time';
export { trackCurrentTime } from './behaviors/track-current-time';
export type { PlaybackInitiatedOwners, PlaybackInitiatedState } from './behaviors/track-playback-initiated';
export { trackPlaybackInitiated } from './behaviors/track-playback-initiated';
export type { PlaybackRateOwners, PlaybackRateState } from './behaviors/track-playback-rate';
export { trackPlaybackRate } from './behaviors/track-playback-rate';
export { appendSegment } from './media/append-segment';
export { flushBuffer } from './media/buffer-flusher';
export type { SpfMediaAPI, SpfMediaProps } from './playback-engine/adapter';
export { SpfMedia, SpfMediaMixin, spfMediaDefaultProps } from './playback-engine/adapter';
export { destroyVttParser, parseVttSegment } from './text/parse-vtt-segment';
