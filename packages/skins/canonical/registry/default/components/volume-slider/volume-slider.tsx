import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/react';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root
      className="group/slider relative flex flex-1 cursor-pointer items-center justify-center rounded-media-pill outline-none data-[orientation=horizontal]:h-8 data-[orientation=horizontal]:min-w-20 data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-8 data-[orientation=vertical]:min-w-0"
      thumbAlignment="edge"
      {...props}
    >
      <VolumeSliderPrimitive.Track className="relative isolate h-media-slider-track w-full select-none overflow-hidden rounded-media-pill bg-media-slider-track data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track">
        <VolumeSliderPrimitive.Fill className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill) group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer) group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)" />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className="absolute z-10 top-1/2 left-(--media-slider-fill) -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current outline-4 -outline-offset-4 outline-transparent hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0 [transition-property:opacity,height,width,outline-offset,left,top] [transition-duration:150ms] [transition-timing-function:ease-out] data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2 group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer) group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))] size-3" />
    </VolumeSliderPrimitive.Root>
  );
}
