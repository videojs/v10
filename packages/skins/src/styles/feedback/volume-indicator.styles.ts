import { styles } from 'vjsc/styles';

const iconVariants = {
  default: 'mix-blend-difference',
  minimal: 'col-start-1 row-start-1 drop-shadow-media-icon',
} as const;

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-volume-indicator',
      utilities: 'group/volume-status',
      variants: {
        default: [
          'w-[min(80%,12rem)] [transform:translateX(0)]',
          'motion-safe:[&:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]:nudge-media',
        ],
      },
    },
    fill: {
      className: 'media-volume-indicator-fill',
      utilities: 'rounded-[inherit]',
      variants: {
        default: [
          'flex w-full bg-left bg-no-repeat',
          '[background-image:linear-gradient(currentColor,currentColor)]',
          '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-media-slow ease-linear',
        ],
        minimal: [
          'grid w-[min(80%,14rem)] grid-cols-[auto_minmax(0,1fr)_auto] [transform:translateX(0)]',
          'before:col-start-2 before:row-start-1 before:h-0.75 before:w-full before:rounded-media-pill',
          'before:bg-current/20 before:shadow-[0_1px_0_var(--media-shadow-subtle-current-color)]',
          'after:col-start-2 after:row-start-1 after:h-0.75 after:w-[var(--media-volume-fill,0%)] after:justify-self-start',
          'after:rounded-media-pill after:bg-media-primary',
          'after:transition-[width] after:duration-media-slow after:ease-linear',
          'motion-safe:group-[:is([data-min],[data-max]):not([data-starting-style],[data-ending-style])]/volume-status:nudge-media',
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
      variants: iconVariants,
    },
    lowIcon: {
      className: 'media-volume-indicator-low-icon',
      utilities: 'hidden shrink-0 group-data-[level=low]/volume-status:block',
      variants: iconVariants,
    },
    offIcon: {
      className: 'media-volume-indicator-off-icon',
      utilities: 'hidden shrink-0 group-data-[level=off]/volume-status:block',
      variants: iconVariants,
    },
  },
});
