import { styles } from 'vjsc/styles';

/** Shared floating indicator shell used by status and volume feedback. */
export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-indicator',
      utilities: [
        'pointer-events-none absolute origin-top text-inherit',
        'duration-media-fast ease-out',
        'media-transitioning:opacity-0 media-transitioning:duration-media-indicator media-transitioning:ease-in',
      ],
      variants: {
        default: [
          'top-3 rounded-media-control font-medium',
          'bg-media-scrim/25 text-media-popover-foreground surface-media after:surface-media-inset',
          'media-opaque:bg-media-background',
          'pointer-coarse:motion-media-[scale,translate,opacity]',
          'pointer-fine:motion-media-[scale,translate,filter,opacity]',
          'pointer-fine:media-transitioning:scale-media-hidden-indicator pointer-fine:media-transitioning:blur-media-hidden',
          'data-ending-style:translate-y-media-hidden-indicator-offset',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32 bg-(image:--media-indicator-gradient) text-shadow-media',
          'pointer-fine:motion-media-[translate,filter,opacity] pointer-coarse:motion-media-[translate,opacity]',
          'pointer-fine:media-transitioning:blur-media-hidden',
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
