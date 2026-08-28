import { EMPTY_TIME_RANGES } from '../../../core/constants';
import type { MediaPlayedCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** DOM-shaped {@link MediaPlayedCapability}: browser hosts hand back real `TimeRanges`. */
export interface HTMLMediaPlayedCapability extends MediaPlayedCapability {
  readonly played: TimeRanges;
}

/** Reporting which parts of the timeline the viewer has actually watched. */
export const playedCapability = defineMediaCapability<HTMLMediaPlayedCapability>()({
  name: 'played',
  events: [],
  props: {
    played: { fallback: EMPTY_TIME_RANGES as TimeRanges, readonly: true },
  },
});
