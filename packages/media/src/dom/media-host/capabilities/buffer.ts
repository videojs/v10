import { EMPTY_TIME_RANGES } from '../../../core/constants';
import type { MediaBufferCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** DOM-shaped {@link MediaBufferCapability}: browser hosts hand back real `TimeRanges`. */
export interface HTMLMediaBufferCapability extends MediaBufferCapability {
  readonly buffered: TimeRanges;
  readonly seekable: TimeRanges;
}

/** Reporting which parts of the timeline are downloaded and reachable. */
export const bufferCapability = defineMediaCapability<HTMLMediaBufferCapability>()({
  name: 'buffer',
  events: ['progress'],
  props: {
    buffered: { fallback: EMPTY_TIME_RANGES as TimeRanges, readonly: true },
    seekable: { fallback: EMPTY_TIME_RANGES as TimeRanges, readonly: true },
  },
});
