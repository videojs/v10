import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/controls.css',
  prefix: 'audio-controls',
  rules: {
    root: {
      utilities: [],
    },
    content: {
      utilities:
        'relative z-20 flex items-center rounded-media-controls bg-media-controls text-media-controls-foreground text-shadow-media',
      variants: {
        default: 'p-0.5 media-lg:p-1 surface-media after:surface-media-inset',
        minimal: 'gap-2 p-1 shadow-media-hairline',
      },
    },
    start: {
      utilities: 'flex items-center gap-px',
    },
    end: {
      utilities: 'flex items-center gap-px',
    },
    spacer: {
      utilities: 'flex-1',
    },
  },
});
