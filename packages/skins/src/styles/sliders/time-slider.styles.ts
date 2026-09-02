import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  prefix: 'media-time-slider',
  rules: {
    root: {
      utilities: [],
    },
    chapters: {
      utilities: 'relative flex size-full min-h-0 min-w-0 flex-1 items-center rounded-[inherit]',
    },
    chapter: {
      utilities: [
        'group/chapter absolute inset-0 flex min-h-0 min-w-0 items-center justify-center',
        '[--media-chapter-inset-start:0.5] [--media-chapter-inset-end:0.5]',
        'first:[--media-chapter-inset-start:0] last:[--media-chapter-inset-end:0]',
        'data-[orientation=horizontal]:clip-media-chapter-x data-[orientation=vertical]:clip-media-chapter-y',
      ],
    },
    chapterTrack: {
      utilities: [
        'transition-[height,width] duration-media-slow ease-out',
        'data-[orientation=horizontal]:clip-media-chapter-track-x data-[orientation=vertical]:clip-media-chapter-track-y',
        'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
        'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
      ],
    },
    thumb: {
      utilities: [
        'opacity-0 data-interactive:opacity-100 focus-visible:opacity-100',
        'pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
      ],
      variants: { default: 'scale-80', minimal: 'scale-70 data-interactive:scale-100' },
    },
    previewContent: {
      utilities: 'flex bottom-[calc(100%+var(--media-slider-preview-label-offset))] tabular-nums',
      variants: {
        default: 'left-1/2 flex-col items-center',
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] flex-row-reverse justify-center gap-2 px-3',
      },
    },
    chapterTitle: {
      utilities: 'max-w-(--media-slider-preview-max-width) min-w-0 truncate empty:hidden',
      variants: { default: 'px-6' },
    },
    value: {
      utilities: 'tabular-nums',
    },
  },
});
