import { defineStyles } from '../define';

const fillBase = [
  'absolute inset-y-0 left-0 rounded-[inherit]',
  'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto',
];

export default defineStyles({
  role: 'sliders',
  styles: {
    slider: [
      'group/slider relative flex min-h-media-control min-w-20 flex-1 cursor-pointer items-center justify-center outline-none',
      'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-media-control data-[orientation=vertical]:min-w-0',
    ],
    sliderTrack: [
      'relative h-media-slider-track w-full overflow-hidden rounded-media-pill bg-media-slider-track',
      'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track',
    ],
    sliderChapters: 'relative flex size-full min-h-0 min-w-0 flex-1 items-center rounded-[inherit]',
    sliderChapter: [
      'group/chapter absolute inset-0 flex min-h-0 min-w-0 items-center justify-center',
      '[--chapter-gap:0.25rem] [--chapter-inset-start:0.5] [--chapter-inset-end:0.5]',
      'first:[--chapter-inset-start:0] last:[--chapter-inset-end:0]',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]',
    ],
    sliderChapterTrack: [
      'relative isolate overflow-hidden rounded-media-pill bg-media-slider-track select-none',
      'motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out',
      'data-[orientation=horizontal]:h-media-slider-track data-[orientation=horizontal]:w-full',
      'group-data-highlighted/chapter:data-[orientation=horizontal]:h-[calc(var(--media-slider-track-size)*1.75)]',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_round_var(--media-radius-pill))]',
      'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track',
      'group-data-highlighted/chapter:data-[orientation=vertical]:w-[calc(var(--media-slider-track-size)*1.75)]',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_0_round_var(--media-radius-pill))]',
    ],
    sliderFill: [...fillBase, 'w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)'],
    sliderBuffer: [
      ...fillBase,
      'w-(--media-slider-buffer) bg-media-slider-buffer',
      'data-[orientation=vertical]:h-(--media-slider-buffer)',
    ],
    sliderThumb: [
      'absolute top-1/2 left-(--media-slider-fill) size-media-slider-thumb -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current',
      'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
    ],
    sliderPreview: 'group/preview relative',
    sliderValue: 'tabular-nums',
    spinnerIcon: 'size-media-icon drop-shadow-media-icon',
    thumbnail: 'absolute bottom-[calc(100%+0.75rem)] overflow-hidden rounded-media-surface',
    thumbnailImage: ['block max-h-28 max-w-48 transition-opacity duration-150 ease-out', 'data-loading:opacity-0'],
    previewValue: 'absolute bottom-[calc(100%+0.75rem)] flex max-w-48 flex-col items-center tabular-nums',
    chapterTitle: 'max-w-48 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
  },
});
