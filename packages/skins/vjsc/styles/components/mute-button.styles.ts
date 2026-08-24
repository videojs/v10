import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-mute-button',
      utilities: [...button, 'group/mute'],
      variants: buttonVariants,
    },
    offIcon: {
      className: 'media-volume-off-icon',
      utilities: [...buttonIcon, 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100'],
      variants: buttonIconVariants,
    },
    lowIcon: {
      className: 'media-volume-low-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
        'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    highIcon: {
      className: 'media-volume-high-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
        'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
