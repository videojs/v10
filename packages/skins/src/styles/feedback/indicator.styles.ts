import { styles } from 'vjsc/styles';

/** Shared floating indicator shell used by status and volume feedback. */
export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-indicator',
      utilities: [
        'pointer-events-none absolute origin-top text-inherit',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
        'duration-media-fast ease-out',
        'data-starting-style:duration-media-indicator data-starting-style:ease-in',
        'data-ending-style:duration-media-indicator data-ending-style:ease-in',
      ],
      variants: {
        default: [
          'top-3 rounded-media-control font-medium',
          'bg-media-scrim/25 text-media-popover-foreground surface-media after:surface-media-inset',
          'media-opaque:bg-media-background',
          'pointer-coarse:motion-media-[scale,translate,opacity]',
          'pointer-fine:motion-media-[scale,translate,filter,opacity]',
          'pointer-fine:data-starting-style:scale-media-hidden-indicator pointer-fine:data-starting-style:blur-media-hidden',
          'pointer-fine:data-ending-style:scale-media-hidden-indicator pointer-fine:data-ending-style:blur-media-hidden',
          'data-ending-style:translate-y-media-hidden-indicator-offset',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32 bg-(image:--media-indicator-gradient) text-shadow-media',
          'pointer-fine:motion-media-[translate,filter,opacity] pointer-coarse:motion-media-[translate,opacity]',
          'pointer-fine:data-starting-style:blur-media-hidden pointer-fine:data-ending-style:blur-media-hidden',
          'data-ending-style:translate-y-media-hidden-indicator-offset',
        ],
      },
    },
    content: {
      className: 'media-indicator-content',
      utilities: 'items-center justify-between gap-2 px-2.5 py-1',
      variants: {
        minimal: 'media-opaque:rounded-media-control media-opaque:bg-media-background',
      },
    },
  },
});
