import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
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
        'motion-safe:transition-[height,width] motion-safe:duration-(--media-duration-slow) motion-safe:ease-out',
        'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_round_var(--media-control-radius))]',
        'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--media-spacing)*var(--media-chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--media-spacing)*var(--media-chapter-inset-start))_0_round_var(--media-control-radius))]',
        'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
        'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
      ],
    },
    thumb: {
      className: 'media-time-slider-thumb',
      utilities: [
        'opacity-0 data-interactive:opacity-100 focus-visible:opacity-100',
        'pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
      ],
      variants: { default: 'scale-80', minimal: 'scale-70 data-interactive:scale-100' },
    },
    previewContent: {
      className: 'media-time-slider-preview-content',
      utilities: 'flex bottom-[calc(100%+var(--media-slider-preview-label-offset))] tabular-nums',
      variants: {
        default: 'left-1/2 flex-col items-center',
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] flex-row-reverse justify-center gap-2 px-3',
      },
    },
    chapterTitle: {
      className: 'media-time-slider-chapter-title',
      utilities: 'max-w-(--media-slider-preview-max-width) min-w-0 truncate empty:hidden',
      variants: { default: 'px-6' },
    },
    value: {
      className: 'media-time-slider-value',
      utilities: 'tabular-nums',
    },
  },
});
