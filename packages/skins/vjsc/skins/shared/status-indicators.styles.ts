import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-video-status-indicators',
      utilities: ['pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white'],
    },
  },
});
