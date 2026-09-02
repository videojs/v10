import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  rules: {
    captionsButton: {
      className: 'video-controls-captions-button',
      utilities: 'media-max-compact:hidden',
    },
    volumeButton: {
      className: 'video-controls-volume-button',
      utilities: 'ms-px',
    },
    settingsButton: {
      className: 'video-controls-settings-button',
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
