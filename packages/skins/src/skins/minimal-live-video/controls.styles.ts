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
        'flex items-center gap-px mask-media-volume [mask-size:400%_100%]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:mask-media-volume-open',
      ],
    },
  },
});
