import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-cast-button',
  rules: {
    root: {
      utilities: 'group/cast',
    },
    enterIcon: {
      utilities: [
        'opacity-0 group-not-data-[cast-state=connected]/cast:scale-100',
        'group-not-data-[cast-state=connected]/cast:opacity-100',
      ],
    },
    exitIcon: {
      utilities: [
        'opacity-0 group-data-[cast-state=connected]/cast:scale-100',
        'group-data-[cast-state=connected]/cast:opacity-100',
      ],
    },
  },
});
