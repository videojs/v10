import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-time-slider',
      utilities: [],
    },
    chapters: {
      className: 'media-time-slider-chapters',
      utilities: 'relative flex size-full min-h-0 min-w-0 flex-1 items-center rounded-[inherit]',
    },
    chapter: {
      className: 'media-time-slider-chapter',
      utilities: [
        'group/chapter absolute inset-0 flex min-h-0 min-w-0 items-center justify-center',
        '[--media-chapter-inset-start:0.5] [--media-chapter-inset-end:0.5]',
        'first:[--media-chapter-inset-start:0] last:[--media-chapter-inset-end:0]',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]',
      ],
    },
    chapterTrack: {
      className: 'media-time-slider-chapter-track',
      utilities: [
        'motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_round_var(--media-control-radius))]',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_0_round_var(--media-control-radius))]',
      ],
      variants: {
        default: [
          'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
          'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
        ],
        minimal: [
          'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
          'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
        ],
      },
    },
    thumb: {
      className: 'media-time-slider-thumb',
      utilities: [
        'opacity-0 data-interactive:opacity-100',
        'pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
      ],
      variants: {
        default: [
          'size-3 scale-80 outline-4 -outline-offset-4 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.35),0_1px_2px_-1px_rgb(0_0_0/0.35)]',
          'hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0',
          'after:pointer-events-none after:absolute after:-inset-1 after:scale-50 after:rounded-[inherit] after:opacity-0',
          'after:shadow-[0_0_0_2px_currentColor] motion-safe:after:transition-[opacity,scale] motion-safe:after:duration-150 motion-safe:after:ease-out',
          'focus-visible:after:scale-100 focus-visible:after:opacity-100 focus-visible:opacity-100',
        ],
        minimal: [
          'size-3 scale-70 outline-2 -outline-offset-2 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_0_rgb(0_0_0/0.15),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
          'focus-visible:outline-white focus-visible:outline-offset-2',
          'data-interactive:scale-100',
        ],
      },
    },
    previewContent: {
      className: 'media-time-slider-preview-content',
      utilities: 'flex tabular-nums',
      variants: {
        default: 'left-1/2 bottom-[calc(100%+2.625rem)] flex-col items-center',
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] bottom-[calc(100%+1.25rem)] flex-row-reverse justify-center gap-2 px-3',
      },
    },
    chapterTitle: {
      className: 'media-time-slider-chapter-title',
      utilities:
        'max-w-(--media-slider-preview-max-width) min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
      variants: {
        default: 'px-6',
        minimal: [],
      },
    },
    value: {
      className: 'media-time-slider-value',
      utilities: 'tabular-nums',
    },
  },
});
