/**
 * VolumeSlider - Full Compound Component
 * Tests all subcomponents
 */

import { VolumeSlider } from '@videojs/react';

export default function TestFixture() {
  return (
    <VolumeSlider.Root className="slider" orientation="vertical">
      <VolumeSlider.Track className="track">
        <VolumeSlider.Progress className="progress" />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb className="thumb" />
    </VolumeSlider.Root>
  );
}
