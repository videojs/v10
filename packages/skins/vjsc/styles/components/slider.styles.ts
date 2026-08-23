import { styles } from 'vjsc/styles';

const fillBase = [
  'pointer-events-none absolute rounded-[inherit]',
  'motion-safe:transition-[clip-path] motion-safe:duration-200 motion-safe:ease-out',
  'group-data-dragging/slider:duration-0 group-data-seeking/slider:duration-0',
];

const previewContent = [
  'absolute max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  'origin-bottom blur-md',
  'motion-safe:transition-[filter,opacity,scale] motion-safe:duration-150 motion-safe:ease-out',
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
        'data-[orientation=horizontal]:[height:var(--media-slider-height,--spacing(8))] data-[orientation=horizontal]:min-w-20',
        'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-8 data-[orientation=vertical]:min-w-0',
      ],
    },
    track: {
      className: 'media-slider-track',
      utilities: [
        'relative isolate w-full select-none overflow-hidden rounded-media-control bg-current/20',
        'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
      ],
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
          'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1',
          'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
          'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
        ],
      },
    },
    fill: {
      className: 'media-slider-fill',
      utilities: [
        ...fillBase,
        'bg-media-accent',
        'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-fill))_0_0_round_var(--media-control-radius))]',
        'group-data-dragging/slider:data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-pointer))_0_0_round_var(--media-control-radius))]',
        'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-fill))_0_0_0_round_var(--media-control-radius))]',
        'group-data-dragging/slider:data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-pointer))_0_0_0_round_var(--media-control-radius))]',
      ],
    },
    buffer: {
      className: 'media-slider-buffer',
      utilities: [
        ...fillBase,
        'bg-current/20',
        'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-buffer))_0_0_round_var(--media-control-radius))]',
        'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-buffer))_0_0_0_round_var(--media-control-radius))]',
      ],
    },
    thumb: {
      className: 'media-slider-thumb',
      utilities: [
        'absolute z-10 top-1/2 left-(--media-slider-fill) -translate-x-1/2 -translate-y-1/2 rounded-media-control bg-current',
        'select-none transition-none motion-safe:transition-[opacity,height,width,outline-offset,left,top,scale] motion-safe:duration-150 motion-safe:ease-out',
        'group-data-dragging/slider:motion-safe:transition-[opacity,height,width,outline-offset,scale]',
        'group-data-dragging/slider:scale-90',
        'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
        'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
        'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]',
      ],
      variants: {
        default: [
          'size-3 scale-80 outline-4 -outline-offset-4 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.35),0_1px_2px_-1px_rgb(0_0_0/0.35)]',
          'hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0',
          'after:pointer-events-none after:absolute after:-inset-1 after:scale-50 after:rounded-[inherit] after:opacity-0',
          'after:shadow-[0_0_0_2px_currentColor] motion-safe:after:transition-[opacity,scale] motion-safe:after:duration-150 motion-safe:after:ease-out',
          'focus-visible:after:scale-100 focus-visible:after:opacity-100',
        ],
        minimal: [
          'size-3 scale-70 outline-2 -outline-offset-2 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_0_rgb(0_0_0/0.15),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
          'focus-visible:outline-white focus-visible:outline-offset-2',
        ],
      },
    },
    interactiveThumb: {
      className: 'media-slider-thumb-interactive',
      utilities: 'opacity-0 pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
      variants: {
        default: 'focus-visible:opacity-100',
        minimal: 'focus-visible:scale-100 focus-visible:opacity-100',
      },
    },
    persistentThumb: {
      className: 'media-slider-thumb-persistent',
      utilities: 'scale-100 opacity-100',
      variants: {
        default: 'size-3',
        minimal: 'size-3',
      },
    },
    preview: {
      className: 'media-slider-preview',
      utilities: [
        'group/preview relative h-1 [--media-slider-preview-max-height:var(--media-slider-preview-max-width)]',
        'before:pointer-events-none before:absolute before:z-1 before:-translate-1/2 before:scale-50 before:opacity-0',
        'motion-safe:before:transition-[opacity,scale] motion-safe:before:duration-200 motion-safe:before:ease-out',
        'data-pointing:not-data-dragging:before:scale-100 data-pointing:not-data-dragging:before:opacity-100',
      ],
      variants: {
        default: [
          'min-w-(--media-slider-preview-max-width)',
          '[--media-slider-preview-max-width:min(--spacing(36),100cqi)] @2xl/media-root:[--media-slider-preview-max-width:min(--spacing(48),100cqi)]',
          'before:top-1/2 before:left-1/2 before:size-1 before:rounded-media-control before:bg-current',
        ],
        minimal: [
          'min-w-full',
          '[--media-slider-preview-max-width:min(--spacing(28),100cqi)]',
          '@lg/media-root:[--media-slider-preview-max-width:min(--spacing(36),100cqi)]',
          '@2xl/media-root:[--media-slider-preview-max-width:min(--spacing(48),100cqi)]',
          '[--media-preview-end-inset:calc(100cqi-100%)]',
          '[--media-preview-left:clamp(calc(var(--media-slider-preview-max-width)/2),var(--media-slider-pointer),calc(100%-var(--media-slider-preview-max-width)/2+var(--media-preview-end-inset)))]',
          '@2xl/media-root:[--media-preview-left:var(--media-slider-pointer)]',
          'before:bg-current/35',
          'data-[orientation=horizontal]:before:top-1/2 data-[orientation=horizontal]:before:left-(--media-slider-pointer)',
          'data-[orientation=horizontal]:before:h-5 data-[orientation=horizontal]:before:w-px',
          'data-[orientation=vertical]:before:top-[calc(100%-var(--media-slider-pointer))] data-[orientation=vertical]:before:left-1/2',
          'data-[orientation=vertical]:before:h-px data-[orientation=vertical]:before:w-5',
        ],
      },
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
        'group/thumbnail pointer-events-none overflow-hidden bg-black/90',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
      variants: {
        default: 'left-1/2 bottom-[calc(100%+2.25rem)] rounded-xl',
        minimal: '[left:var(--media-preview-left,var(--media-slider-pointer))] bottom-[calc(100%+2.75rem)] rounded-lg',
      },
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
      utilities: [...previewContent, 'flex tabular-nums'],
      variants: {
        default: 'left-1/2 bottom-[calc(100%+2.625rem)] flex-col items-center',
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] bottom-[calc(100%+1.25rem)] flex-row-reverse justify-center gap-2 px-3',
      },
    },
    chapterTitle: {
      className: 'media-chapter-title',
      utilities:
        'max-w-(--media-slider-preview-max-width) min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
      variants: {
        default: 'px-6',
        minimal: [],
      },
    },
  },
});
