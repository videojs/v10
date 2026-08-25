import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-seek-button',
      utilities: [],
    },
    backwardIcon: {
      className: 'media-seek-button-backward-icon',
      utilities: '-scale-x-100',
    },
    label: {
      className: 'media-seek-button-label',
      utilities: 'tabular-nums',
    },
  },
});
