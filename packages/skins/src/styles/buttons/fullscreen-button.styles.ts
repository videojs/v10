import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-fullscreen-button',
  rules: {
    root: {
      utilities: 'group/fullscreen',
    },
    enterIcon: {
      utilities: [
        'opacity-0 group-not-data-fullscreen/fullscreen:scale-100 group-not-data-fullscreen/fullscreen:opacity-100',
      ],
    },
    exitIcon: {
      utilities: ['opacity-0 group-data-fullscreen/fullscreen:scale-100 group-data-fullscreen/fullscreen:opacity-100'],
    },
  },
});
