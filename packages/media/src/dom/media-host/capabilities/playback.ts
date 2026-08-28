import type { MediaPlaybackCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/** Starting playback. The one capability every media has; without it there is nothing to host. */
export const playbackCapability = defineMediaCapability<MediaPlaybackCapability>()({
  name: 'playback',
  events: ['play', 'playing', 'waiting'],
  props: {},
  methods: {
    play: { fallback: () => Promise.reject(new DOMException('No media is attached.', 'NotSupportedError')) },
  },
});
