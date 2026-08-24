import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-fullscreen-button',
      utilities: [...button, 'group/fullscreen'],
      variants: buttonVariants,
    },
    enterIcon: {
      className: 'media-fullscreen-enter-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    exitIcon: {
      className: 'media-fullscreen-exit-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
