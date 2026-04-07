/**
 * Mock volume feature.
 *
 * Exercises: numeric state property, type alias (MediaFeatureAvailability),
 * methods with parameters and return values, boolean state property.
 */
import type { MediaVolumeState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const volumeFeature = definePlayerFeature({
  name: 'volume',
  state: (): MediaVolumeState => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'available',
    setVolume(_volume: number) {
      return 1;
    },
    toggleMuted() {
      return false;
    },
  }),
});
