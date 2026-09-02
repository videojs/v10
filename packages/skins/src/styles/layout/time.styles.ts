import { styles } from 'vjsc/styles';

export default styles({
  file: 'time.css',
  prefix: 'media-time',
  rules: {
    group: {
      utilities: 'flex items-center gap-1',
    },
    value: {
      utilities: 'tabular-nums',
    },
    toggle: {
      utilities: [
        'cursor-pointer rounded-sm tabular-nums focus-ring-media',
        'transition-[outline-color,outline-offset] duration-media-fast ease-out',
        'focus-visible:outline-media-ring focus-visible:outline-offset-2',
      ],
      variants: {
        minimal:
          'supports-[corner-shape:squircle]:rounded-2xl supports-[corner-shape:squircle]:[corner-shape:squircle]',
      },
    },
    currentValue: {
      utilities: 'hidden media-wide:inline',
    },
    separator: {
      utilities: 'hidden media-wide:inline media-wide:text-current/60',
    },
    durationValue: {
      utilities: 'tabular-nums media-wide:text-current/60',
    },
  },
});
