import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicator.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-seek-indicator',
      utilities: [
        'group/seek-status col-start-2 row-start-1 grid place-content-center gap-1 p-4 text-center',
        'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start',
        'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end',
      ],
    },
    icon: {
      className: 'media-seek-indicator-icon',
      utilities: [
        'hidden size-media-icon-lg group-data-direction/seek-status:block',
        'group-data-[direction=backward]/seek-status:[scale:-1_1]',
        'transition-[translate,opacity] duration-200 ease-in-out motion-reduce:duration-50',
        'group-data-starting-style/seek-status:opacity-0 group-data-ending-style/seek-status:opacity-0',
      ],
    },
    value: {
      className: 'media-seek-indicator-value',
      utilities: 'tabular-nums',
    },
  },
});
