import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  rules: {
    content: {
      className: 'video-controls-wrap',
      utilities: 'flex-wrap @media-wide/media-root:flex-nowrap',
    },
    start: {
      className: 'video-controls-start',
      utilities: 'flex flex-1 items-center gap-px @media-wide/media-root:flex-none',
    },
    end: {
      className: 'video-controls-end',
      utilities: [
        'flex flex-1 items-center justify-end gap-px @media-wide/media-root:flex-none',
        '@max-media-wide/media-root:[mask-repeat:no-repeat]',
        '@max-media-wide/media-root:[mask-position:100%_0] @max-media-wide/media-root:[mask-size:400%_100%]',
        '@max-media-wide/media-root:[transition:mask-position_var(--media-duration-instant)_ease-out]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@max-media-wide/media-root:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@max-media-wide/media-root:[mask-position:0_0]',
      ],
    },
    trailing: {
      className: 'video-controls-trailing',
      utilities: 'flex items-center gap-px',
    },
    timeSliderGroup: {
      className: 'video-time-slider-group',
      utilities: [
        '@container/video-time-controls -order-1 flex flex-none basis-full flex-row-reverse items-center gap-3 px-1.5',
        '[--media-slider-height:--spacing(5)]',
        '@media-wide/media-root:order-none @media-wide/media-root:min-w-0 @media-wide/media-root:flex-1 @media-wide/media-root:flex-row',
        '@media-wide/media-root:[--media-slider-height:--spacing(8)]',
        '@media-wide/media-root:[mask-repeat:no-repeat]',
        '@media-wide/media-root:[mask-position:100%_0] @media-wide/media-root:[mask-size:200%_100%]',
        '@media-wide/media-root:[transition:mask-position_var(--media-duration-instant)_ease-out]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@media-wide/media-root:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
        'group-has-[[data-volume-level][aria-expanded=true]]/controls:@media-wide/media-root:[mask-position:0_0]',
      ],
    },
  },
});
