/**
 * Mock playback feature.
 *
 * Exercises: simple boolean state properties, void and Promise<void> action methods,
 * JSDoc description extraction from the state interface.
 */
import type { MediaPlaybackState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const playbackFeature = definePlayerFeature({
  name: 'playback',
  state: (): MediaPlaybackState => ({
    paused: true,
    ended: false,
    play() {
      return Promise.resolve();
    },
    pause() {},
  }),
});
