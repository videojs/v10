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
        'relative z-20 flex items-center rounded-media-controls bg-media-controls p-1 text-media-controls-foreground text-shadow-media',
      variants: {
        default: 'surface-media after:surface-media-inset',
        minimal: 'gap-2 shadow-media-hairline',
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
