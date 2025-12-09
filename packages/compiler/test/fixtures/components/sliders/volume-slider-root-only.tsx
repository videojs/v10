/**
 * VolumeSlider - Root Only
 * Tests: Root → base name, orientation prop
 */

import { VolumeSlider } from '@videojs/react';

export default function TestFixture() {
  return (
    <VolumeSlider.Root
      className="slider"
      orientation="vertical"
    />
  );
}
