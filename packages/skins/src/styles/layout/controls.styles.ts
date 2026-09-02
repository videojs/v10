import { styles } from 'vjsc/styles';

/** Surface chrome for control groups while they float as separate bars below the compact breakpoint. */
const compactSurface = [
  'media-max-compact:bg-media-popover media-max-compact:text-media-popover-foreground',
  'media-max-compact:surface-media media-max-compact:after:surface-media-inset',
] as const;

/** Hide a floating control group with its parent controls below the compact breakpoint. */
const compactHidden = [
  'media-max-compact:group-[:not([data-visible])]/controls:pointer-events-none',
  'media-max-compact:group-[:not([data-visible])]/controls:opacity-0',
  'media-max-compact:group-[:not([data-visible])]/controls:scale-media-hidden',
  'media-max-compact:pointer-fine:group-[:not([data-visible])]/controls:blur-media-hidden',
  'transition-[filter,opacity,scale,translate] duration-media-controls-half ease-out',
  'media-max-compact:group-[:not([data-visible])]/controls:duration-media-controls',
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
        'duration-media-controls-half ease-out',
      ],
      variants: {
        default: [
          'contents p-1 transition-[filter,opacity,scale,translate]',
          'media-compact:absolute media-compact:inset-x-2 media-compact:bottom-2 media-compact:z-10',
          'media-compact:flex media-compact:items-center media-compact:rounded-media-control',
          'media-compact:bg-media-popover media-compact:text-media-popover-foreground',
          'media-compact:surface-media media-compact:after:surface-media-inset',
          'media-wide:inset-x-3 media-wide:bottom-3',
          'media-compact:not-data-visible:pointer-events-none media-compact:not-data-visible:opacity-0',
          'media-compact:not-data-visible:scale-media-hidden media-compact:not-data-visible:translate-y-media-hidden-offset',
          'media-compact:pointer-fine:not-data-visible:blur-media-hidden',
          'media-compact:not-data-visible:duration-media-controls',
        ],
        minimal: [
          'absolute inset-x-1 bottom-1 z-20 flex items-center gap-x-2 rounded-xl bg-transparent p-1 media-opaque:bg-media-background',
          'transition-[filter,opacity,translate]',
          'not-data-visible:pointer-events-none not-data-visible:opacity-0',
          'not-data-visible:duration-media-controls',
          'not-data-visible:translate-y-media-hidden-offset pointer-fine:not-data-visible:blur-media-hidden',
          'media-wide:inset-x-2 media-wide:bottom-2',
          'media-wide:[--media-popover-side-offset:--spacing(3)]',
          'media-wide:[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        ],
      },
    },
    backdrop: {
      className: 'video-controls-backdrop',
      utilities: [
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-(image:--media-controls-gradient)',
        'transition-opacity duration-media-controls ease-out not-data-visible:opacity-0',
      ],
    },
    primary: {
      className: 'video-controls-primary',
      utilities: [
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center rounded-media-control p-1',
        ...compactSurface,
        'media-compact:contents',
        ...compactHidden,
        'media-max-compact:group-[:not([data-visible])]/controls:translate-y-media-hidden-offset',
      ],
    },
    secondary: {
      className: 'video-controls-secondary',
      utilities: [
        'absolute top-2 right-2 z-10 flex origin-top items-center gap-px rounded-media-control p-1',
        ...compactSurface,
        'media-compact:static media-compact:p-0',
        ...compactHidden,
        'media-max-compact:group-[:not([data-visible])]/controls:-translate-y-media-hidden-offset',
      ],
    },
    spacer: {
      className: 'video-controls-spacer',
      utilities: 'flex-1',
    },
  },
});
