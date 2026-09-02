import { styles } from 'vjsc/styles';

export default styles({
  file: 'live-video/controls.css',
  rules: {
    start: {
      className: 'video-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'video-controls-end',
      utilities: [
        'flex items-center gap-px',
        '[mask-repeat:no-repeat] [mask-position:100%_0] [mask-size:400%_100%]',
        '[transition:mask-position_var(--media-duration-instant)_ease-out]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:[mask-position:0_0]',
      ],
    },
  },
});
