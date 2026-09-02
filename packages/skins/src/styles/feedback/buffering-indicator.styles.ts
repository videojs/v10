import { styles } from 'vjsc/styles';

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-buffering-indicator',
      utilities: [
        'pointer-events-none absolute inset-0 hidden place-content-center text-media-controls-foreground',
        'before:absolute before:inset-0 before:bg-media-scrim/35 before:backdrop-blur-sm',
        'not-data-visible:[--media-spinner-animation:none] data-visible:grid',
      ],
    },
    spinnerIcon: {
      className: 'media-buffering-indicator-spinner-icon',
      utilities: 'relative z-30 size-media-icon drop-shadow-media-icon',
    },
  },
});
