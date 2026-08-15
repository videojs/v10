import { BufferingIndicator as BufferingIndicatorPrimitive } from '@videojs/react';
import { SpinnerIcon } from '@videojs/react/icons';

export function BufferingIndicator() {
  return (
    <BufferingIndicatorPrimitive className="pointer-events-none absolute inset-0 z-10 hidden place-content-center text-white not-data-visible:[--media-spinner-animation:none] data-visible:grid">
      <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
    </BufferingIndicatorPrimitive>
  );
}
