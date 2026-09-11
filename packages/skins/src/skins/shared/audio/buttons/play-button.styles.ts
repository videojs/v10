import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/play-button.css',
  prefix: 'audio-play-button',
  rules: {
    root: {
      utilities: 'relative inline-flex',
    },
    bufferingIndicator: {
      utilities: ['z-20 rounded-media-control text-inherit! before:hidden', 'data-visible:bg-media-controls'],
    },
  },
});
