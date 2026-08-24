import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-seek-button',
      utilities: button,
      variants: buttonVariants,
    },
    icon: {
      className: 'media-seek-button-icon',
      utilities: buttonIcon,
      variants: buttonIconVariants,
    },
    backwardIcon: {
      className: 'media-seek-button-backward-icon',
      utilities: [...buttonIcon, '-scale-x-100'],
      variants: buttonIconVariants,
    },
    label: {
      className: 'media-seek-button-label',
      utilities: 'tabular-nums',
    },
  },
});
