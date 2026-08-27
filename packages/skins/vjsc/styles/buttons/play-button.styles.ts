import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-play-button',
      utilities: 'group/play',
    },
    restartIcon: {
      className: 'media-play-button-restart-icon',
      utilities:
        'scale-0 opacity-0 group-data-ended/play:scale-100 group-data-ended/play:opacity-100 motion-reduce:scale-100',
    },
    playIcon: {
      className: 'media-play-button-play-icon',
      utilities: [
        'scale-0 opacity-0 motion-reduce:scale-100',
        'group-not-data-ended/play:group-data-paused/play:opacity-100',
        'group-not-data-ended/play:group-data-paused/play:scale-100',
        'group-not-data-ended/play:group-not-data-started/play:opacity-100',
        'group-not-data-ended/play:group-not-data-started/play:scale-100',
      ],
    },
    pauseIcon: {
      className: 'media-play-button-pause-icon',
      utilities: [
        'scale-0 opacity-0 motion-reduce:scale-100',
        'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
        'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:scale-100',
      ],
    },
  },
});
