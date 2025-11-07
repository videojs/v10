/**
 * TimeSlider - Root Only
 * Tests: Root → base name, orientation prop
 */

import { TimeSlider } from '@videojs/react';

export default function TestFixture() {
  return (
    <TimeSlider.Root
      className="slider"
      orientation="horizontal"
    />
  );
}
