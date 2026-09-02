import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/controls.css',
  rules: {
    root: {
      className: 'audio-controls',
      utilities: [],
    },
    content: {
      className: 'audio-controls-content',
      utilities:
        'relative z-20 flex items-center bg-media-controls p-1 text-media-controls-foreground text-shadow-media',
      variants: {
        default: 'rounded-media-control surface-media after:surface-media-inset',
        minimal: 'gap-2 rounded-[--spacing(3.5)] shadow-[0_0_0_1px_var(--media-border)]',
      },
    },
    start: {
      className: 'audio-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'audio-controls-end',
      utilities: 'flex items-center gap-px',
    },
    spacer: {
      className: 'audio-controls-spacer',
      utilities: 'flex-1',
    },
  },
});
