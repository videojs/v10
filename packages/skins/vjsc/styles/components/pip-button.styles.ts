import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-pip-button',
      utilities: [...button, 'group/pip'],
      variants: buttonVariants,
    },
    enterIcon: {
      className: 'media-pip-enter-icon',
      utilities: [...buttonIcon, 'hidden opacity-0 group-not-data-pip/pip:block group-not-data-pip/pip:opacity-100'],
      variants: buttonIconVariants,
    },
    exitIcon: {
      className: 'media-pip-exit-icon',
      utilities: [...buttonIcon, 'hidden opacity-0 group-data-pip/pip:block group-data-pip/pip:opacity-100'],
      variants: buttonIconVariants,
    },
  },
});
