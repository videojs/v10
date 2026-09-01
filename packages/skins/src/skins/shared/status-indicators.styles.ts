import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/status-indicators.css',
  rules: {
    root: {
      className: 'video-status-indicators',
      utilities: ['pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white'],
    },
  },
});
