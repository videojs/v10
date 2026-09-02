import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/play-button.css',
  rules: {
    root: {
      className: 'audio-play-button',
      utilities: 'relative inline-flex',
    },
    bufferingIndicator: {
      className: 'audio-play-button-buffering-indicator',
      utilities: ['z-20 rounded-media-control text-inherit! before:hidden', 'data-visible:bg-media-controls'],
    },
  },
});
