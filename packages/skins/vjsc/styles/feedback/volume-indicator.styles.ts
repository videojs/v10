import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-volume-indicator',
      utilities: [
        'group/volume-status pointer-events-none absolute origin-top text-inherit',
        'duration-100 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          'top-3 w-[min(80%,12rem)] rounded-[9999px] bg-black/25 font-medium [transform:translateX(0)]',
          'data-starting-style:duration-250 data-starting-style:ease-in',
          'data-ending-style:duration-250 data-ending-style:ease-in',
          'pointer-coarse:transition-[scale,translate,opacity] pointer-coarse:will-change-[scale,translate,opacity]',
          'pointer-fine:motion-safe:transition-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
          'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-1/4',
          'motion-safe:[&:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]:[transform:translateX(0.25px)]',
          'motion-safe:[&:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]:[transition:transform_300ms_linear(0,-24_20%,16_40%,-8_60%,4_80%,1)]',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32',
          'status-indicator-gradient',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
          'data-starting-style:duration-400 data-starting-style:ease-in',
          'data-ending-style:duration-400 data-ending-style:ease-in',
          'pointer-fine:transition-[translate,filter,opacity] pointer-fine:will-change-[translate,filter,opacity]',
          'pointer-coarse:transition-[translate,opacity] pointer-coarse:will-change-[translate,opacity]',
          'pointer-fine:motion-safe:data-starting-style:blur-sm pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    },
    fill: {
      className: 'media-volume-indicator-fill',
      utilities: ['items-center justify-between gap-2 rounded-[inherit] px-2.5 py-1'],
      variants: {
        default: [
          'flex w-full bg-left bg-no-repeat',
          '[background-image:linear-gradient(currentColor,currentColor)]',
          '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-200 ease-linear',
        ],
        minimal: [
          'grid w-[min(80%,14rem)] grid-cols-[auto_minmax(0,1fr)_auto] [transform:translateX(0)]',
          'before:col-start-2 before:row-start-1 before:h-0.75 before:w-full before:rounded-[9999px]',
          'before:bg-current/20 before:shadow-[0_1px_0_rgb(255_255_255/0.15)]',
          'after:col-start-2 after:row-start-1 after:h-0.75 after:w-[var(--media-volume-fill,0%)] after:justify-self-start',
          'after:rounded-[9999px] after:bg-media-accent',
          'after:transition-[width] after:duration-200 after:ease-linear',
          '[@media(prefers-reduced-transparency:reduce)]:rounded-[--spacing(2)]',
          '[@media(prefers-reduced-transparency:reduce)]:bg-black',
          'contrast-more:rounded-[--spacing(2)] contrast-more:bg-black',
          'motion-safe:group-[:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]/volume-status:[transform:translateX(0.25px)]',
          'motion-safe:group-[:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]/volume-status:[transition:transform_300ms_linear(0,-24_20%,16_40%,-8_60%,4_80%,1)]',
        ],
      },
    },
    value: {
      className: 'media-volume-indicator-value',
      utilities: [],
      variants: { default: 'ml-auto mix-blend-difference', minimal: 'col-start-3 row-start-1' },
    },
    highIcon: {
      className: 'media-volume-indicator-high-icon',
      utilities: 'hidden shrink-0 group-data-[level=high]/volume-status:block',
      variants: {
        default: 'mix-blend-difference',
        minimal: 'col-start-1 row-start-1 drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    lowIcon: {
      className: 'media-volume-indicator-low-icon',
      utilities: 'hidden shrink-0 group-data-[level=low]/volume-status:block',
      variants: {
        default: 'mix-blend-difference',
        minimal: 'col-start-1 row-start-1 drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    offIcon: {
      className: 'media-volume-indicator-off-icon',
      utilities: 'hidden shrink-0 group-data-[level=off]/volume-status:block',
      variants: {
        default: 'mix-blend-difference',
        minimal: 'col-start-1 row-start-1 drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
  },
});
