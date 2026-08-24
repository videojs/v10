import { styles } from 'vjsc/styles';
import { sliderBuffer, sliderFill, sliderPreviewContent, sliderRoot, sliderThumb } from '../slider';

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-time-slider',
      ...sliderRoot,
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
    buffer: {
      className: 'media-time-slider-buffer',
      ...sliderBuffer,
    },
    fill: {
      className: 'media-time-slider-fill',
      ...sliderFill,
    },
    thumb: {
      className: 'media-time-slider-thumb',
      utilities: [
        ...sliderThumb.utilities,
        'opacity-0 data-interactive:scale-100 data-interactive:opacity-100',
        'pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
      ],
      variants: {
        default: [...sliderThumb.variants.default, 'focus-visible:opacity-100'],
        minimal: [...sliderThumb.variants.minimal, 'focus-visible:scale-100 focus-visible:opacity-100'],
      },
    },
    preview: {
      className: 'media-time-slider-preview',
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
    previewContent: {
      className: 'media-time-slider-preview-content',
      utilities: [...sliderPreviewContent, 'flex tabular-nums'],
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
