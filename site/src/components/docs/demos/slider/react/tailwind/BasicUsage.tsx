import { Slider } from '@videojs/react';
import { useState } from 'react';

export default function BasicUsage() {
  const [value, setValue] = useState(50);

  return (
    <div className="flex items-center bg-neutral-900 p-6">
      <Slider.Root
        className="relative flex h-5 w-full cursor-pointer items-center"
        value={value}
        onValueChange={setValue}
      >
        <Slider.Track className="absolute inset-x-0 h-1 rounded-full bg-white/30 transition-[height] duration-150 in-data-interactive:h-1.5">
          <Slider.Fill className="absolute top-0 left-0 h-full w-(--media-slider-fill) rounded-full bg-white" />
        </Slider.Track>
        <Slider.Thumb className="absolute left-(--media-slider-fill) size-3.5 -translate-x-1/2 scale-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-150 in-data-interactive:scale-100 in-data-dragging:scale-110" />
      </Slider.Root>
    </div>
  );
}
