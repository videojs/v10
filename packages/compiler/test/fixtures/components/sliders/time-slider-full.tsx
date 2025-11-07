/**
 * TimeSlider - Full Compound Component
 * Tests all subcomponents
 */

import { TimeSlider } from '@videojs/react';

export default function TestFixture() {
  return (
    <TimeSlider.Root className="slider">
      <TimeSlider.Track className="track">
        <TimeSlider.Progress className="progress" />
        <TimeSlider.Pointer className="pointer" />
      </TimeSlider.Track>
      <TimeSlider.Thumb className="thumb" />
    </TimeSlider.Root>
  );
}
