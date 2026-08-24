import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-cast-button',
      utilities: [...button, 'group/cast'],
      variants: buttonVariants,
    },
    enterIcon: {
      className: 'media-cast-enter-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-[cast-state=connected]/cast:block',
        'group-not-data-[cast-state=connected]/cast:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    exitIcon: {
      className: 'media-cast-exit-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-data-[cast-state=connected]/cast:block',
        'group-data-[cast-state=connected]/cast:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
