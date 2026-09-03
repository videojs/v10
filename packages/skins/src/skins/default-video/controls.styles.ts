import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  prefix: 'video-controls',
  rules: {
    captionsButton: {
      utilities: 'media-max-compact:hidden',
    },
    volumeButton: {
      utilities: 'ms-px',
    },
    settingsButton: {
      utilities: 'media-compact:ms-px',
    },
    timeSliderGroup: {
      className: 'video-time-slider-group',
      utilities: '@container/media-time flex flex-1 items-center gap-2.5 px-2 media-compact:px-3',
    },
    timeValue: {
      className: 'video-time-value',
      utilities: '@max-[16rem]/media-time:hidden',
    },
  },
});
