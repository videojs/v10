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
      utilities: ['hidden opacity-0 group-not-data-active/captions:block group-not-data-active/captions:opacity-100'],
    },
    onIcon: {
      className: 'media-captions-button-on-icon',
      utilities: ['hidden opacity-0 group-data-active/captions:block group-data-active/captions:opacity-100'],
    },
  },
});
