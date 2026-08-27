import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-audio-play-button',
      utilities: 'relative inline-flex',
    },
    bufferingIndicator: {
      className: 'media-audio-play-button-buffering-indicator',
      utilities: [
        'z-20 rounded-media-control text-inherit! before:hidden!',
        'data-visible:bg-(--media-audio-controls-background-color)',
      ],
    },
  },
});
