import { defineStyles } from '../define';

const fillBase = [
  'absolute inset-y-0 left-0 rounded-[inherit]',
  'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto',
];

const previewContent = [
  'absolute left-1/2 max-w-(--max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  '[filter:blur(16px)] origin-bottom',
  '[transition-property:filter,opacity,scale] [transition-duration:150ms] [transition-timing-function:ease-out]',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:[filter:none]',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:scale-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:opacity-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:[filter:none]',
];

export default defineStyles({
  role: 'sliders',
  styles: {
    slider: [
      'group/slider relative flex flex-1 cursor-pointer items-center justify-center rounded-media-pill outline-none',
      'data-[orientation=horizontal]:h-8 data-[orientation=horizontal]:min-w-20',
      'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-8 data-[orientation=vertical]:min-w-0',
    ],
    sliderTrack: [
      'relative isolate h-media-slider-track w-full select-none overflow-hidden rounded-media-pill bg-media-slider-track',
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
    sliderFill: [
      ...fillBase,
      'w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)',
      'group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer)',
      'group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)',
    ],
    sliderBuffer: [
      ...fillBase,
      'w-(--media-slider-buffer) bg-media-slider-buffer',
      'data-[orientation=vertical]:h-(--media-slider-buffer)',
    ],
    sliderThumb: [
      'absolute z-10 top-1/2 left-(--media-slider-fill) -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current',
      'outline-4 -outline-offset-4 outline-transparent hover:outline-current/15 hover:outline-offset-0',
      'focus-visible:outline-current/15 focus-visible:outline-offset-0',
      '[transition-property:opacity,height,width,outline-offset,left,top] [transition-duration:150ms] [transition-timing-function:ease-out]',
      'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
      'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
      'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]',
    ],
    sliderThumbInteractive: [
      'size-2.5 opacity-0 focus-visible:opacity-100 group-hover/slider:opacity-100',
      'group-active/slider:size-3 group-focus-within/slider:size-3',
    ],
    sliderThumbPersistent: 'size-3',
    sliderPreview: [
      'group/preview relative h-1 min-w-(--max-width)',
      '[--max-width:min(12rem,100cqi)] [--max-height:8rem]',
      'before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-1 before:size-1 before:-translate-1/2 before:scale-50 before:rounded-media-pill before:bg-current before:opacity-0',
      'before:[transition-property:opacity,scale] before:[transition-duration:200ms] before:[transition-timing-function:ease-out]',
      'data-pointing:not-data-dragging:before:scale-100 data-pointing:not-data-dragging:before:opacity-100',
    ],
    sliderValue: 'tabular-nums',
    spinnerIcon: [
      'absolute top-1/2 left-1/2 size-media-icon -translate-x-1/2 -translate-y-1/2 opacity-0 drop-shadow-media-icon',
      'group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
    ],
    thumbnail: [
      ...previewContent,
      'group/thumbnail pointer-events-none bottom-[calc(100%+2.25rem)] overflow-hidden rounded-xl bg-black/90',
      '[--thumbnail-max-width:var(--max-width)]',
      'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--thumbnail-max-width)',
    ],
    thumbnailImage: [
      'relative block max-h-(--max-height) max-w-(--thumbnail-max-width) overflow-clip rounded-[inherit]',
      '[transition-property:opacity] [transition-duration:150ms] [transition-timing-function:ease-out]',
      'data-loading:opacity-0',
    ],
    previewValue: [...previewContent, 'bottom-[calc(100%+2.625rem)] flex flex-col items-center tabular-nums'],
    chapterTitle: 'max-w-(--max-width) min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 empty:hidden',
  },
});
