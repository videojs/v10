import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-seek-button',
  rules: {
    content: {
      utilities: 'relative grid',
    },
    audio: {
      utilities: 'hidden media-sm:grid',
    },
    backwardIcon: {
      utilities: 'transform-[scaleX(-1)]',
    },
    label: {
      // The seconds sit inside the arc the icon draws, so they are placed against it, not flowed after it.
      utilities: 'absolute bottom-[-3px] text-[9px] font-medium tracking-tighter tabular-nums',
    },
    backwardLabel: {
      utilities: '-left-px',
    },
    forwardLabel: {
      utilities: '-right-px',
    },
  },
});
