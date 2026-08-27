import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-pip-button',
      utilities: 'group/pip',
    },
    enterIcon: {
      className: 'media-pip-button-enter-icon',
      utilities: 'opacity-0 group-not-data-pip/pip:scale-100 group-not-data-pip/pip:opacity-100',
    },
    exitIcon: {
      className: 'media-pip-button-exit-icon',
      utilities: 'opacity-0 group-data-pip/pip:scale-100 group-data-pip/pip:opacity-100',
    },
  },
});
