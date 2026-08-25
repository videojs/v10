import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-fullscreen-button',
      utilities: 'group/fullscreen',
    },
    enterIcon: {
      className: 'media-fullscreen-button-enter-icon',
      utilities: [
        'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
      ],
    },
    exitIcon: {
      className: 'media-fullscreen-button-exit-icon',
      utilities: [
        'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
      ],
    },
  },
});
