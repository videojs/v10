import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-seek-button',
  rules: {
    root: {
      utilities: [],
    },
    content: {
      utilities: 'relative grid',
    },
    backwardIcon: {
      utilities: '-scale-x-100',
    },
    label: {
      utilities: 'absolute bottom-[-3px] text-media-xs font-medium tracking-[-0.05em] tabular-nums',
    },
    backwardLabel: {
      utilities: 'left-[-1px]',
    },
    forwardLabel: {
      utilities: 'right-[-1px]',
    },
  },
});
