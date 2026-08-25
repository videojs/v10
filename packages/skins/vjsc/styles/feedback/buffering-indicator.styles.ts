import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-buffering-indicator',
      utilities: [
        'pointer-events-none absolute inset-0 hidden place-content-center text-white',
        'before:absolute before:inset-0 before:bg-black/35 before:backdrop-blur-sm',
        'not-data-visible:[--media-spinner-animation:none] data-visible:grid motion-reduce:[--media-spinner-animation:none]',
      ],
    },
    spinnerIcon: {
      className: 'media-buffering-indicator-spinner-icon',
      utilities: 'relative z-30 size-media-icon',
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
  },
});
