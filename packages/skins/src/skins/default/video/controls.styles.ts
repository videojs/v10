import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  prefix: 'video-controls',
  rules: {
    volumeButton: {
      utilities: 'ms-px',
    },
    settingsButton: {
      utilities: 'media-lg:ms-px',
    },
    timeSliderGroup: {
      className: 'video-time-slider-group',
      utilities: '@container/media-time flex flex-1 items-center rtl:flex-row-reverse gap-2.5 px-2 media-lg:px-3',
    },
    timeValue: {
      className: 'video-time-value',
      utilities: '@max-[16rem]/media-time:hidden',
    },
  },
});
