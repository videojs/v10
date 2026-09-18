import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/status-indicators.css',
  prefix: 'video-status-indicators',
  rules: {
    root: {
      // Transient feedback stacks above the title (`z-20`, earlier in the DOM) and below the controls (`z-30`).
      utilities: [
        'pointer-events-none absolute inset-0 z-20 grid grid-cols-3 items-center justify-items-center',
        'text-media-controls-foreground',
      ],
    },
  },
});
