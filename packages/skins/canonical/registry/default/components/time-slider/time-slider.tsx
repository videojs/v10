import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/react';
import { SpinnerIcon } from '@videojs/react/icons';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className="group/slider relative flex min-h-media-control min-w-20 flex-1 cursor-pointer items-center justify-center outline-none data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-media-control data-[orientation=vertical]:min-w-0">
      <TimeSliderPrimitive.Chapters
        className="relative flex size-full min-h-0 min-w-0 flex-1 items-center rounded-[inherit]"
        renderChapter={(props) => (
          <div
            {...props}
            className="group/chapter absolute inset-0 flex min-h-0 min-w-0 items-center justify-center [--chapter-gap:0.25rem] [--chapter-inset-start:0.5] [--chapter-inset-end:0.5] first:[--chapter-inset-start:0] last:[--chapter-inset-end:0] data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))] data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]"
          >
            <TimeSliderPrimitive.Track className="relative isolate overflow-hidden rounded-media-pill bg-media-slider-track select-none motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out data-[orientation=horizontal]:h-media-slider-track data-[orientation=horizontal]:w-full group-data-highlighted/chapter:data-[orientation=horizontal]:h-[calc(var(--media-slider-track-size)*1.75)] data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_round_var(--media-radius-pill))] data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track group-data-highlighted/chapter:data-[orientation=vertical]:w-[calc(var(--media-slider-track-size)*1.75)] data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_0_round_var(--media-radius-pill))]">
              <TimeSliderPrimitive.Buffer className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-buffer) bg-media-slider-buffer data-[orientation=vertical]:h-(--media-slider-buffer)" />
              <TimeSliderPrimitive.Fill className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)" />
            </TimeSliderPrimitive.Track>
          </div>
        )}
      >
        <TimeSliderPrimitive.Track className="relative h-media-slider-track w-full overflow-hidden rounded-media-pill bg-media-slider-track data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track">
          <TimeSliderPrimitive.Buffer className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-buffer) bg-media-slider-buffer data-[orientation=vertical]:h-(--media-slider-buffer)" />
          <TimeSliderPrimitive.Fill className="absolute inset-y-0 left-0 rounded-[inherit] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)" />
        </TimeSliderPrimitive.Track>
      </TimeSliderPrimitive.Chapters>
      <TimeSliderPrimitive.Thumb className="absolute top-1/2 left-(--media-slider-fill) size-media-slider-thumb -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2" />
      <TimeSliderPrimitive.Preview className="group/preview relative" overflow="visible">
        <div className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface absolute bottom-[calc(100%+0.75rem)] overflow-hidden rounded-media-surface">
          <Slider.Thumbnail className="block max-h-28 max-w-48 transition-opacity duration-150 ease-out data-loading:opacity-0" />
          <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
        </div>
        <div className="absolute bottom-[calc(100%+0.75rem)] flex max-w-48 flex-col items-center tabular-nums">
          <TimeSliderPrimitive.ChapterTitle className="max-w-48 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden" />
          <TimeSliderPrimitive.Value className="tabular-nums" type="pointer" />
        </div>
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
