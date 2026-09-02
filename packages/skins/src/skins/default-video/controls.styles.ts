import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  rules: {
    captionsButton: {
      className: 'video-controls-captions-button',
      utilities: '@max-media-compact/media-root:hidden',
    },
    volumeButton: {
      className: 'video-controls-volume-button',
      utilities: 'ms-px',
    },
    settingsButton: {
      className: 'video-controls-settings-button',
      utilities: '@media-compact/media-root:ms-px',
    },
    timeSliderGroup: {
      className: 'video-time-slider-group',
      utilities: '@container/media-time flex flex-1 items-center gap-2.5 px-2 @media-compact/media-root:px-3',
    },
    timeValue: {
      className: 'video-time-value',
      utilities: '@max-[16rem]/media-time:hidden',
    },
  },
});
