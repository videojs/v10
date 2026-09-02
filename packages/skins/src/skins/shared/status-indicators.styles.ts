import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/status-indicators.css',
  prefix: 'video-status-indicators',
  rules: {
    root: {
      utilities:
        'pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-media-controls-foreground',
    },
  },
});
