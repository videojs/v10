import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-captions-button',
      utilities: 'group/captions',
    },
    offIcon: {
      className: 'media-captions-button-off-icon',
      utilities: ['opacity-0 group-not-data-active/captions:scale-100 group-not-data-active/captions:opacity-100'],
    },
    onIcon: {
      className: 'media-captions-button-on-icon',
      utilities: ['opacity-0 group-data-active/captions:scale-100 group-data-active/captions:opacity-100'],
    },
  },
});
