import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/react';
import { SpinnerIcon } from '@videojs/react/icons';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className="group/slider relative flex min-h-media-control min-w-20 flex-1 cursor-pointer items-center justify-center outline-none data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-media-control data-[orientation=vertical]:min-w-0">
      <TimeSliderPrimitive.Track className="relative h-media-slider-track w-full overflow-hidden rounded-media-pill bg-media-slider-track data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track">
        <TimeSliderPrimitive.Buffer className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-buffer) bg-media-slider-buffer data-[orientation=vertical]:h-(--media-slider-buffer)" />
        <TimeSliderPrimitive.Fill className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)" />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className="absolute top-1/2 left-(--media-slider-fill) size-media-slider-thumb -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2" />
      <div className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface absolute bottom-[calc(100%+0.75rem)] overflow-hidden rounded-media-surface">
        <Slider.Thumbnail className="block max-h-28 max-w-48" />
        <TimeSliderPrimitive.Value className="tabular-nums" type="pointer" />
        <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
      </div>
      <TimeSliderPrimitive.Preview className="relative">
        <TimeSliderPrimitive.Value className="tabular-nums" type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
