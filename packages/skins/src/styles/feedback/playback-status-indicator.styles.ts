import { styles } from 'vjsc/styles';

const icon = [
  'col-start-1 row-start-1 scale-media-hidden-icon opacity-0',
  'transition-[opacity,scale] duration-media-base ease-out',
] as const;

const iconVariants = {
  default: ['size-media-icon-lg'],
  minimal: ['size-media-icon-xl'],
} as const;

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-playback-status-indicator',
      utilities: [
        'group/playback-status col-start-2 row-start-1 grid place-content-center p-4 text-center',
        'transition-[opacity,scale] duration-media-slow ease-out',
        'data-starting-style:scale-media-hidden-playback data-starting-style:opacity-0',
        'data-ending-style:scale-media-hidden-playback data-ending-style:opacity-0 data-ending-style:duration-media-fast data-ending-style:ease-in',
      ],
      variants: { default: 'rounded-media-pill bg-media-scrim/35 backdrop-blur-sm' },
    },
    playIcon: {
      className: 'media-playback-status-indicator-play-icon',
      utilities: [
        ...icon,
        'group-data-[status=play]/playback-status:scale-100 group-data-[status=play]/playback-status:opacity-100',
      ],
      variants: {
        default: [...iconVariants.default, 'group-data-[status=play]/playback-status:translate-x-px'],
        minimal: iconVariants.minimal,
      },
    },
    pauseIcon: {
      className: 'media-playback-status-indicator-pause-icon',
      utilities: [
        ...icon,
        'group-data-[status=pause]/playback-status:scale-100 group-data-[status=pause]/playback-status:opacity-100',
      ],
      variants: iconVariants,
    },
  },
});
