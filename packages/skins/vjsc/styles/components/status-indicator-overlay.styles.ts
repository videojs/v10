import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicator.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-status-indicator-overlay',
      utilities: ['pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white'],
    },
  },
});
