import { styles } from 'vjsc/styles';

const icon = [
  'col-start-1 row-start-1 scale-0 opacity-0',
  'transition-[opacity,scale] duration-150 ease-out',
  'motion-reduce:scale-100 motion-reduce:transition-opacity motion-reduce:duration-50',
] as const;

const iconVariants = {
  default: ['size-media-icon-lg'],
  minimal: ['size-media-icon-xl'],
} as const;

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-playback-status-indicator',
      utilities: [
        'group/playback-status col-start-2 row-start-1 grid place-content-center p-4 text-center',
        'transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-opacity motion-reduce:duration-50',
        'data-starting-style:scale-85 data-starting-style:opacity-0',
        'data-ending-style:scale-85 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in',
        'motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100',
      ],
      variants: { default: 'rounded-[9999px] bg-black/35 backdrop-blur-sm', minimal: '' },
    },
    playIcon: {
      className: 'media-playback-status-indicator-play-icon',
      utilities: [
        ...icon,
        'group-data-[status=play]/playback-status:scale-100 group-data-[status=play]/playback-status:opacity-100 group-data-[status=play]/playback-status:translate-x-px',
      ],
      variants: iconVariants,
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
