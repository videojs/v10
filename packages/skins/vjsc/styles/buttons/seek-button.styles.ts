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
      utilities: 'absolute bottom-[-3px] text-[0.715em] font-medium tracking-[-0.05em] tabular-nums',
    },
    backwardLabel: {
      className: 'media-seek-button-backward-label',
      utilities: 'left-[-1px]',
    },
    forwardLabel: {
      className: 'media-seek-button-forward-label',
      utilities: 'right-[-1px]',
    },
  },
});
