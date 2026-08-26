import { styles } from 'vjsc/styles';

export default styles({
  file: 'controls.css',
  layer: 'videojs.components',
  rules: {
    provider: {
      className: 'media-controls-provider',
      utilities: 'contents',
    },
    root: {
      className: 'media-controls',
      utilities: [
        'group/controls absolute inset-x-1 bottom-1 z-20 flex flex-wrap items-center gap-x-2 rounded-xl bg-transparent text-white',
        'text-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
        '[@media(prefers-reduced-transparency:reduce)]:bg-black contrast-more:bg-black forced-colors:bg-[Canvas]',
        '[--media-popover-side-offset:--spacing(5)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(2)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        'p-1 transition-[filter,opacity,translate]',
        'duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
        'not-data-visible:pointer-events-none not-data-visible:opacity-0',
        'not-data-visible:duration-(--media-controls-transition-duration)',
        'motion-safe:not-data-visible:translate-y-full pointer-fine:motion-safe:not-data-visible:blur-sm',
        '@2xl/media-root:inset-x-2 @2xl/media-root:bottom-2 @2xl/media-root:flex-nowrap',
        '@2xl/media-root:[--media-popover-side-offset:--spacing(3)]',
      ],
    },
    backdrop: {
      className: 'media-controls__backdrop',
      utilities: [
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit]',
        'bg-linear-to-t from-black/70 via-black/50 via-[length:calc(var(--media-spacing)*30)] to-transparent',
        'transition-opacity duration-(--media-controls-transition-duration) ease-out not-data-visible:opacity-0',
      ],
    },
    start: {
      className: 'media-controls-start',
      utilities: 'flex flex-1 items-center gap-px @2xl/media-root:flex-none',
    },
    end: {
      className: 'media-controls-end',
      utilities: 'flex flex-1 items-center justify-end gap-px @2xl/media-root:flex-none',
    },
    trailing: {
      className: 'media-controls-trailing',
      utilities: 'flex items-center gap-px',
    },
    timeSliderGroup: {
      className: 'media-time-slider-group',
      utilities: [
        '@container/media-time-controls -order-1 flex flex-none basis-full flex-row-reverse items-center gap-3 px-1.5',
        '[--media-slider-height:--spacing(5)]',
        '@2xl/media-root:order-none @2xl/media-root:min-w-0 @2xl/media-root:flex-1 @2xl/media-root:flex-row',
        '@2xl/media-root:[--media-slider-height:--spacing(8)]',
        '@2xl/media-root:[mask-position:100%_0] @2xl/media-root:[mask-size:200%_100%]',
        '@2xl/media-root:[transition:mask-position_50ms_ease-out]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[mask-position:0_0]',
      ],
    },
    timeGroup: {
      className: 'media-time-group',
      utilities: 'flex items-center gap-1',
    },
    currentValue: {
      className: 'media-time-current-value',
      utilities: [
        'hidden cursor-pointer rounded-sm tabular-nums outline-2 -outline-offset-2 outline-transparent',
        'supports-[corner-shape:squircle]:rounded-2xl supports-[corner-shape:squircle]:[corner-shape:squircle]',
        'focus-visible:outline-white focus-visible:outline-offset-2 @2xl/media-root:inline',
      ],
    },
    timeSeparator: {
      className: 'media-time-separator',
      utilities: 'hidden text-current/60 @2xl/media-root:inline',
    },
    durationValue: {
      className: 'media-time-duration-value',
      utilities: 'tabular-nums text-current/60',
    },
  },
});
