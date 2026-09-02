import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-pip-button',
  rules: {
    root: {
      utilities: 'group/pip',
    },
    enterIcon: {
      utilities: 'opacity-0 group-not-data-pip/pip:scale-100 group-not-data-pip/pip:opacity-100',
    },
    exitIcon: {
      utilities: 'opacity-0 group-data-pip/pip:scale-100 group-data-pip/pip:opacity-100',
    },
  },
});
