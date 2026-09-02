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
        'duration-(--media-duration-fast) ease-out',
      ],
      variants: {
        default: [
          'top-3 rounded-media-control font-medium',
          'bg-media-scrim/25 text-media-popover-foreground surface-media after:surface-media-inset',
          'opaque:bg-media-background',
          'data-starting-style:duration-(--media-duration-slower) data-starting-style:ease-in',
          'data-ending-style:duration-(--media-duration-slower) data-ending-style:ease-in',
          'pointer-coarse:motion-media-[scale,translate,opacity]',
          'pointer-fine:motion-safe:motion-media-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
          'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-1/4',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32 bg-(image:--media-indicator-gradient) text-shadow-media',
          'data-starting-style:duration-400 data-starting-style:ease-in',
          'data-ending-style:duration-400 data-ending-style:ease-in',
          'pointer-fine:motion-media-[translate,filter,opacity] pointer-coarse:motion-media-[translate,opacity]',
          'pointer-fine:motion-safe:data-starting-style:blur-sm pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    },
    content: {
      className: 'media-indicator-content',
      utilities: 'items-center justify-between gap-2 px-2.5 py-1',
      variants: {
        minimal: 'opaque:rounded-media-control opaque:bg-media-background',
      },
    },
  },
});
