import { styles } from 'vjsc/styles';

export default styles({
  file: 'time.css',
  rules: {
    group: {
      className: 'media-time-group',
      utilities: 'flex items-center gap-1',
    },
    value: {
      className: 'media-time-value',
      utilities: 'tabular-nums',
    },
    toggle: {
      className: 'media-time-toggle',
      utilities: [
        'cursor-pointer rounded-sm tabular-nums focus-ring-media',
        'transition-[outline-color,outline-offset] duration-(--media-duration-fast) ease-out',
        'focus-visible:outline-media-ring focus-visible:outline-offset-2',
      ],
      variants: {
        minimal:
          'supports-[corner-shape:squircle]:rounded-2xl supports-[corner-shape:squircle]:[corner-shape:squircle]',
      },
    },
    currentValue: {
      className: 'media-time-current-value',
      utilities: 'hidden @media-wide/media-root:inline',
    },
    separator: {
      className: 'media-time-separator',
      utilities: 'hidden @media-wide/media-root:inline @media-wide/media-root:text-current/60',
    },
    durationValue: {
      className: 'media-time-duration-value',
      utilities: 'tabular-nums @media-wide/media-root:text-current/60',
    },
  },
});
