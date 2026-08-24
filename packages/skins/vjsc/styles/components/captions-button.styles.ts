import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-captions-button',
      utilities: [...button, 'group/captions'],
      variants: buttonVariants,
    },
    offIcon: {
      className: 'media-captions-off-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-active/captions:block group-not-data-active/captions:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    onIcon: {
      className: 'media-captions-on-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-data-active/captions:block group-data-active/captions:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
