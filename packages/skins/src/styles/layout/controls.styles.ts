import { styles } from 'vjsc/styles';

/** Surface chrome for control groups while they float as separate bars below the compact breakpoint. */
const compactSurface = [
  '@max-media-compact/media-root:bg-media-popover @max-media-compact/media-root:text-media-popover-foreground',
  '@max-media-compact/media-root:surface-media @max-media-compact/media-root:after:surface-media-inset',
] as const;

/** Hide a floating control group with its parent controls below the compact breakpoint. */
const compactHidden = [
  '@max-media-compact/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
  '@max-media-compact/media-root:group-[:not([data-visible])]/controls:opacity-0',
  '@max-media-compact/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
  '@max-media-compact/media-root:pointer-fine:motion-safe:group-[:not([data-visible])]/controls:blur-sm',
  'transition-[filter,opacity,scale,translate] duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
  '@max-media-compact/media-root:group-[:not([data-visible])]/controls:duration-(--media-controls-transition-duration)',
] as const;

export default styles({
  file: 'video/controls.css',
  rules: {
    root: {
      className: 'video-controls',
      utilities: [],
    },
    content: {
      className: 'video-controls-content',
      utilities: [
        'group/controls text-media-controls-foreground text-shadow-media',
        'duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
      ],
      variants: {
        default: [
          'contents p-1 transition-[filter,opacity,scale,translate]',
          '@media-compact/media-root:absolute @media-compact/media-root:inset-x-2 @media-compact/media-root:bottom-2 @media-compact/media-root:z-10',
          '@media-compact/media-root:flex @media-compact/media-root:items-center @media-compact/media-root:rounded-media-control',
          '@media-compact/media-root:bg-media-popover @media-compact/media-root:text-media-popover-foreground',
          '@media-compact/media-root:surface-media @media-compact/media-root:after:surface-media-inset',
          '@media-wide/media-root:inset-x-3 @media-wide/media-root:bottom-3',
          '@media-compact/media-root:not-data-visible:pointer-events-none @media-compact/media-root:not-data-visible:opacity-0',
          '@media-compact/media-root:motion-safe:not-data-visible:scale-95 @media-compact/media-root:motion-safe:not-data-visible:translate-y-1',
          '@media-compact/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
          '@media-compact/media-root:not-data-visible:duration-(--media-controls-transition-duration)',
        ],
        minimal: [
          'absolute inset-x-1 bottom-1 z-20 flex items-center gap-x-2 rounded-xl bg-transparent p-1 opaque:bg-media-background',
          'transition-[filter,opacity,translate]',
          'not-data-visible:pointer-events-none not-data-visible:opacity-0',
          'not-data-visible:duration-(--media-controls-transition-duration)',
          'motion-safe:not-data-visible:translate-y-full pointer-fine:motion-safe:not-data-visible:blur-sm',
          '@media-wide/media-root:inset-x-2 @media-wide/media-root:bottom-2',
          '@media-wide/media-root:[--media-popover-side-offset:--spacing(3)]',
          '@media-wide/media-root:[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        ],
      },
    },
    backdrop: {
      className: 'video-controls-backdrop',
      utilities: [
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-(image:--media-controls-gradient)',
        'transition-opacity duration-(--media-controls-transition-duration) ease-out not-data-visible:opacity-0',
      ],
    },
    primary: {
      className: 'video-controls-primary',
      utilities: [
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center rounded-media-control p-1',
        ...compactSurface,
        '@media-compact/media-root:contents',
        ...compactHidden,
        '@max-media-compact/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
      ],
    },
    secondary: {
      className: 'video-controls-secondary',
      utilities: [
        'absolute top-2 right-2 z-10 flex origin-top items-center gap-px rounded-media-control p-1',
        ...compactSurface,
        '@media-compact/media-root:static @media-compact/media-root:p-0',
        ...compactHidden,
        '@max-media-compact/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1',
      ],
    },
    spacer: {
      className: 'video-controls-spacer',
      utilities: 'flex-1',
    },
  },
});
