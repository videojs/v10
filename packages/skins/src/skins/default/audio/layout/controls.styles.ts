import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/controls.css',
  prefix: 'audio',
  rules: {
    seekButton: {
      utilities: 'media-max-lg:hidden',
    },
    timeSliderGroup: {
      utilities: '@container/audio-time-controls flex min-w-0 flex-1 items-center rtl:flex-row-reverse gap-2.5 px-3',
    },
    remainingValue: {
      className: 'audio-time-remaining-value',
      utilities: '@max-[16rem]/audio-time-controls:hidden',
    },
  },
});
