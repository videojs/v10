import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-airplay-button',
      utilities: [
        'group/airplay',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
        'motion-reduce:[--media-icon-airplay-fill-animation:none]',
        'motion-reduce:[--media-icon-airplay-triangle-animation:none]',
      ],
    },
    enterIcon: {
      className: 'media-airplay-button-enter-icon',
      utilities: [
        'opacity-0 group-not-data-[airplay-state=connected]/airplay:scale-100',
        'group-not-data-[airplay-state=connected]/airplay:opacity-100',
      ],
    },
    exitIcon: {
      className: 'media-airplay-button-exit-icon',
      utilities: [
        'opacity-0 group-data-[airplay-state=connected]/airplay:scale-100',
        'group-data-[airplay-state=connected]/airplay:opacity-100',
      ],
    },
  },
});
