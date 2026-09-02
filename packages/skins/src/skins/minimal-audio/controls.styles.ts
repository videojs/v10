import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/controls.css',
  rules: {
    timeSliderGroup: {
      className: 'audio-time-slider-group',
      utilities: [
        '@container/audio-time-controls flex min-w-0 flex-1 flex-row-reverse items-center gap-3',
        '@media-wide/media-root:flex-row',
      ],
    },
  },
});
