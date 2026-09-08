import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  prefix: 'video-controls',
  rules: {
    content: {
      className: 'video-controls-wrap',
      utilities: 'flex-wrap media-wide:flex-nowrap',
    },
    start: {
      utilities: 'flex flex-1 items-center gap-px media-wide:flex-none',
    },
    end: {
      utilities: [
        'flex flex-1 items-center justify-end gap-px media-wide:flex-none',
        'media-max-wide:mask-media-volume media-max-wide:[mask-size:400%_100%]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:media-max-wide:mask-media-volume-open',
      ],
    },
    trailing: {
      utilities: 'flex items-center gap-px',
    },
    timeSliderGroup: {
      className: 'video-time-slider-group',
      utilities: [
        '@container/video-time-controls -order-1 flex flex-none basis-full flex-row-reverse items-center gap-3 px-1.5',
        '[--media-slider-height:--spacing(5)]',
        'media-wide:order-none media-wide:min-w-0 media-wide:flex-1 media-wide:flex-row',
        'media-wide:[--media-slider-height:--spacing(8)]',
        'media-wide:mask-media-volume media-wide:[mask-size:200%_100%]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:media-wide:mask-media-volume-open',
      ],
    },
  },
});
