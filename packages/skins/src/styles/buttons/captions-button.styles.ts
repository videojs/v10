import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-captions-button',
  rules: {
    root: {
      utilities: 'group/captions',
    },
    offIcon: {
      utilities: ['opacity-0 group-not-data-active/captions:scale-100 group-not-data-active/captions:opacity-100'],
    },
    onIcon: {
      utilities: ['opacity-0 group-data-active/captions:scale-100 group-data-active/captions:opacity-100'],
    },
  },
});
