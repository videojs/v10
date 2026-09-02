import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/controls.css',
  rules: {
    seekButton: {
      className: 'audio-seek-button',
      utilities: '@max-media-compact/media-root:hidden',
    },
    timeSliderGroup: {
      className: 'audio-time-slider-group',
      utilities: '@container/audio-time-controls flex min-w-0 flex-1 items-center gap-2.5 px-3',
    },
    remainingValue: {
      className: 'audio-time-remaining-value',
      utilities: '@max-[16rem]/audio-time-controls:hidden',
    },
  },
});
