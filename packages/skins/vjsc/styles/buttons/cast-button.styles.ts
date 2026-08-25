import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-cast-button',
      utilities: 'group/cast',
    },
    enterIcon: {
      className: 'media-cast-button-enter-icon',
      utilities: [
        'hidden opacity-0 group-not-data-[cast-state=connected]/cast:block',
        'group-not-data-[cast-state=connected]/cast:opacity-100',
      ],
    },
    exitIcon: {
      className: 'media-cast-button-exit-icon',
      utilities: [
        'hidden opacity-0 group-data-[cast-state=connected]/cast:block',
        'group-data-[cast-state=connected]/cast:opacity-100',
      ],
    },
  },
});
