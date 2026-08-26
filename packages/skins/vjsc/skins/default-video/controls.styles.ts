import { styles } from 'vjsc/styles';

const defaultSurfaceAtLarge = [
  '@lg/media-root:text-white @lg/media-root:backdrop-blur-lg @lg/media-root:backdrop-saturate-150',
  '@lg/media-root:after:pointer-events-none @lg/media-root:after:absolute @lg/media-root:after:inset-0 @lg/media-root:after:z-10 @lg/media-root:after:rounded-[inherit]',
  '@lg/media-root:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:bg-black @lg/media-root:[@media(prefers-reduced-transparency:reduce)]:ring-1 @lg/media-root:[@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  '@lg/media-root:contrast-more:bg-black @lg/media-root:contrast-more:ring-1 @lg/media-root:contrast-more:ring-transparent @lg/media-root:contrast-more:backdrop-filter-none',
  '@lg/media-root:contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  '@lg/media-root:forced-colors:bg-[Canvas] @lg/media-root:forced-colors:ring-1 @lg/media-root:forced-colors:ring-[CanvasText]',
  '@lg/media-root:forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
  '@lg/media-root:shadow-sm @lg/media-root:shadow-black/15 @lg/media-root:ring-1 @lg/media-root:ring-black/10',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:shadow-sm @lg/media-root:[@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  '@lg/media-root:contrast-more:shadow-sm @lg/media-root:contrast-more:shadow-black/15',
  '@lg/media-root:forced-colors:shadow-sm @lg/media-root:forced-colors:shadow-black/15',
  '@lg/media-root:bg-white/10',
] as const;

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
        'group/controls contents p-1 text-white',
        '[--media-popover-side-offset:--spacing(3)]',
        '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:0.75rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        '@lg/media-root:absolute @lg/media-root:inset-x-2 @lg/media-root:bottom-2 @lg/media-root:z-10',
        '@lg/media-root:flex @lg/media-root:items-center @lg/media-root:gap-px @lg/media-root:rounded-media-control',
        'text-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        ...defaultSurfaceAtLarge,
        '@2xl/media-root:inset-x-3 @2xl/media-root:bottom-3',
        '@lg/media-root:not-data-visible:pointer-events-none @lg/media-root:not-data-visible:opacity-0',
        '@lg/media-root:motion-safe:not-data-visible:scale-95 @lg/media-root:motion-safe:not-data-visible:translate-y-1',
        '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
      ],
    },
    backdrop: {
      className: 'media-controls__backdrop',
      utilities: [
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit]',
        'bg-linear-to-t from-black/50 via-black/30 via-25% to-transparent',
        'transition-opacity duration-(--media-controls-transition-duration) ease-out not-data-visible:opacity-0',
      ],
    },
    primary: {
      className: 'media-controls-primary',
      utilities: [
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center gap-px rounded-media-control',
        'p-1',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
      ],
    },
    secondary: {
      className: 'media-controls-secondary',
      utilities: [
        'absolute top-2 right-2 z-10 flex origin-top items-center gap-px rounded-media-control',
        'p-1',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
      ],
    },
    captionsButton: {
      className: 'media-controls-captions-button',
      utilities: '@max-lg/media-root:hidden',
    },
    timeSliderGroup: {
      className: 'media-time-slider-group',
      utilities: ['@container/media-time flex flex-1 items-center gap-2.5 px-2 @lg/media-root:px-3'],
    },
    currentValue: {
      className: 'media-time-current-value',
      utilities: 'tabular-nums',
    },
    remainingValue: {
      className: 'media-time-remaining-value',
      utilities: [
        'cursor-pointer tabular-nums rounded-sm outline-2 -outline-offset-2 outline-transparent',
        '@max-[16rem]/media-time:hidden',
        'focus-visible:outline-white focus-visible:outline-offset-2',
      ],
    },
  },
});
