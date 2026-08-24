import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-airplay-button',
      utilities: [
        ...button,
        'group/airplay',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
      ],
      variants: buttonVariants,
    },
    enterIcon: {
      className: 'media-airplay-enter-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-[airplay-state=connected]/airplay:block',
        'group-not-data-[airplay-state=connected]/airplay:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    exitIcon: {
      className: 'media-airplay-exit-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-data-[airplay-state=connected]/airplay:block',
        'group-data-[airplay-state=connected]/airplay:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
