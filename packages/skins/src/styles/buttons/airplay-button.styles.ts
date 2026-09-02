import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-airplay-button',
  rules: {
    root: {
      utilities: [
        'group/airplay',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
      ],
    },
    enterIcon: {
      utilities: [
        'opacity-0 group-not-data-[airplay-state=connected]/airplay:scale-100',
        'group-not-data-[airplay-state=connected]/airplay:opacity-100',
      ],
    },
    exitIcon: {
      utilities: [
        'opacity-0 group-data-[airplay-state=connected]/airplay:scale-100',
        'group-data-[airplay-state=connected]/airplay:opacity-100',
      ],
    },
  },
});
