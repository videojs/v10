import type { MediaVolumeState } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { VolumePopoverCore } from '../core';

function createMediaState(volumeAvailability: MediaVolumeState['volumeAvailability']): MediaVolumeState {
  return { volumeAvailability } as MediaVolumeState;
}

describe('VolumePopoverCore', () => {
  it.each([
    ['available', false],
    ['unavailable', true],
    ['unsupported', true],
  ] as const)('maps %s volume controls to hidden=%s', (availability, hidden) => {
    const core = new VolumePopoverCore();

    core.setInput({ active: false, status: 'idle' });
    core.setMedia(createMediaState(availability));

    expect(core.getState()).toMatchObject({ availability, hidden });
  });
});
