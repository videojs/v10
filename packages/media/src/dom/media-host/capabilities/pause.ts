import type { MediaPauseCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Suspending playback. A media that plays through once, unstoppably, composes `playback` without this. */
export const pauseCapability = defineMediaCapability<MediaPauseCapability>()({
  name: 'pause',
  events: ['pause', 'ended'],
  props: {
    paused: { fallback: true, readonly: true },
    ended: { fallback: false, readonly: true },
  },
  methods: {
    pause: { fallback: () => undefined },
  },
});
