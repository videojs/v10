import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-seek-indicator',
      utilities: [
        'group/seek-status col-start-2 row-start-1 grid place-content-center gap-1 p-4 text-center',
        '@2xl/media-root:p-6',
        'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start',
        'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end',
      ],
    },
    icon: {
      className: 'media-seek-indicator-icon',
      utilities: [
        'hidden size-media-icon-lg group-data-direction/seek-status:block',
        'group-data-[direction=backward]/seek-status:[scale:-1_1]',
        'motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-in-out',
        'motion-safe:group-data-starting-style/seek-status:opacity-0 motion-safe:group-data-ending-style/seek-status:opacity-0',
        'motion-safe:group-data-[direction=forward]/seek-status:group-data-starting-style/seek-status:[translate:-60%_0]',
        'motion-safe:group-data-[direction=backward]/seek-status:group-data-starting-style/seek-status:[translate:60%_0]',
      ],
    },
    value: {
      className: 'media-seek-indicator-value',
      utilities: 'tabular-nums',
    },
  },
});
