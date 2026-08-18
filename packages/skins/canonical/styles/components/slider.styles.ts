import { styles } from 'vjsc/styles';

const fillBase = [
  'absolute inset-y-0 left-0 rounded-[inherit]',
  'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto',
];

const previewContent = [
  'absolute left-1/2 max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  'origin-bottom blur-lg',
  'transition-[filter,opacity,scale] duration-150 ease-out motion-reduce:duration-50',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:filter-none',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:scale-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:opacity-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:filter-none',
];

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-slider',
      utilities: [
        'group/slider relative flex flex-1 cursor-pointer items-center justify-center rounded-media-control outline-none',
        'data-[orientation=horizontal]:h-8 data-[orientation=horizontal]:min-w-20',
        'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-8 data-[orientation=vertical]:min-w-0',
      ],
    },
    track: {
      className: 'media-slider-track',
      utilities: [
        'relative isolate w-full select-none overflow-hidden rounded-media-control bg-current/20',
        'data-[orientation=vertical]:h-full',
      ],
      variants: {
        default: 'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1',
        minimal: 'data-[orientation=horizontal]:h-[--spacing(0.75)] data-[orientation=vertical]:w-[--spacing(0.75)]',
      },
    },
    chapters: {
      className: 'media-slider-chapters',
      utilities: 'relative flex size-full min-h-0 min-w-0 flex-1 items-center rounded-[inherit]',
    },
    chapter: {
      className: 'media-slider-chapter',
      utilities: [
        'group/chapter absolute inset-0 flex min-h-0 min-w-0 items-center justify-center',
        '[--media-chapter-inset-start:0.5] [--media-chapter-inset-end:0.5]',
        'first:[--media-chapter-inset-start:0] last:[--media-chapter-inset-end:0]',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]',
      ],
    },
    chapterTrack: {
      className: 'media-slider-chapter-track',
      utilities: [
        'relative isolate overflow-hidden rounded-media-control bg-current/20 select-none',
        'motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out',
        'data-[orientation=horizontal]:w-full',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_round_var(--media-control-radius))]',
        'data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_0_round_var(--media-control-radius))]',
      ],
      variants: {
        default: [
          'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1',
          'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
          'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
        ],
        minimal: [
          'data-[orientation=horizontal]:h-[--spacing(0.75)] data-[orientation=vertical]:w-[--spacing(0.75)]',
          'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.25',
          'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.25',
        ],
      },
    },
    fill: {
      className: 'media-slider-fill',
      utilities: [
        ...fillBase,
        'w-(--media-slider-fill) bg-media-accent data-[orientation=vertical]:h-(--media-slider-fill)',
        'group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer)',
        'group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)',
      ],
    },
    buffer: {
      className: 'media-slider-buffer',
      utilities: [
        ...fillBase,
        'w-(--media-slider-buffer) bg-current/20',
        'data-[orientation=vertical]:h-(--media-slider-buffer)',
      ],
    },
    thumb: {
      className: 'media-slider-thumb',
      utilities: [
        'absolute z-10 top-1/2 left-(--media-slider-fill) -translate-x-1/2 -translate-y-1/2 rounded-media-control bg-current',
        'outline-4 -outline-offset-4 outline-transparent hover:outline-current/15 hover:outline-offset-0',
        'focus-visible:outline-current/15 focus-visible:outline-offset-0',
        'transition-[opacity,height,width,outline-offset,left,top] duration-150 ease-out motion-reduce:duration-50',
        'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
        'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
        'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]',
      ],
    },
    interactiveThumb: {
      className: 'media-slider-thumb-interactive',
      utilities: [
        'size-2.5 opacity-0 focus-visible:opacity-100 group-hover/slider:opacity-100',
        'group-active/slider:size-3 group-focus-within/slider:size-3',
      ],
    },
    persistentThumb: {
      className: 'media-slider-thumb-persistent',
      utilities: 'size-3',
    },
    preview: {
      className: 'media-slider-preview',
      utilities: [
        'group/preview relative h-1 min-w-(--media-slider-preview-max-width)',
        '[--media-slider-preview-max-width:min(--spacing(48),100cqi)] [--media-slider-preview-max-height:--spacing(32)]',
        'before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-1 before:size-1 before:-translate-1/2 before:scale-50 before:rounded-media-control before:bg-current before:opacity-0',
        'before:transition-[opacity,scale] before:duration-200 before:ease-out motion-reduce:before:duration-50',
        'data-pointing:not-data-dragging:before:scale-100 data-pointing:not-data-dragging:before:opacity-100',
      ],
    },
    value: {
      className: 'media-slider-value',
      utilities: 'tabular-nums',
    },
    spinner: {
      className: 'media-spinner-icon',
      utilities: [
        'absolute top-1/2 left-1/2 size-media-icon -translate-x-1/2 -translate-y-1/2 opacity-0',
        'group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
      ],
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    thumbnail: {
      className: 'media-thumbnail',
      utilities: [
        ...previewContent,
        'group/thumbnail pointer-events-none bottom-[calc(100%+2.25rem)] overflow-hidden rounded-xl bg-black/90',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
    },
    image: {
      className: 'media-thumbnail-image',
      utilities: [
        'relative block max-h-(--media-slider-preview-max-height) max-w-(--media-slider-preview-max-width) overflow-clip rounded-[inherit]',
        'transition-opacity duration-150 ease-out motion-reduce:duration-50',
        'data-loading:opacity-0',
      ],
    },
    previewValue: {
      className: 'media-preview-value',
      utilities: [...previewContent, 'bottom-[calc(100%+2.625rem)] flex flex-col items-center tabular-nums'],
    },
    chapterTitle: {
      className: 'media-chapter-title',
      utilities:
        'max-w-(--media-slider-preview-max-width) min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 empty:hidden',
    },
  },
});
