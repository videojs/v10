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
        'group/controls absolute inset-x-1 bottom-1 z-20 flex items-center gap-x-2 rounded-xl bg-transparent p-1 text-white',
        'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        '[@media(prefers-reduced-transparency:reduce)]:bg-black contrast-more:bg-black forced-colors:bg-[Canvas]',
        '[--media-popover-side-offset:--spacing(5)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(2)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        'transition-[filter,opacity,translate] duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
        'not-data-visible:pointer-events-none not-data-visible:opacity-0',
        'not-data-visible:duration-(--media-controls-transition-duration)',
        'motion-safe:not-data-visible:translate-y-full pointer-fine:motion-safe:not-data-visible:blur-sm',
        '@2xl/media-root:inset-x-2 @2xl/media-root:bottom-2',
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
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'media-controls-end',
      utilities: [
        'flex items-center gap-px',
        '[mask-repeat:no-repeat] [mask-position:100%_0] [mask-size:400%_100%]',
        '[transition:mask-position_50ms_ease-out]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:[mask-position:0_0]',
      ],
    },
    spacer: {
      className: 'media-controls-spacer',
      utilities: 'flex-1',
    },
  },
});
