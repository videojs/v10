import { styles } from 'vjsc/styles';

const trackLayer = [
  'pointer-events-none absolute rounded-[inherit]',
  'motion-safe:transition-[clip-path] motion-safe:duration-200 motion-safe:ease-out',
  'group-data-dragging/slider:duration-0 group-data-seeking/slider:duration-0',
] as const;

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
    fill: {
      className: 'media-slider-fill',
      utilities: [
        ...trackLayer,
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
        ...trackLayer,
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
    previewContent: {
      className: 'media-slider-preview-content',
      utilities: [
        'absolute max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
        'origin-bottom blur-md',
        'motion-safe:transition-[filter,opacity,scale] motion-safe:duration-150 motion-safe:ease-out',
        'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:filter-none',
        'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:scale-100',
        'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:opacity-100',
        'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:filter-none',
      ],
    },
  },
});
