import { styles } from 'vjsc/styles';
import { button, buttonIcon, buttonIconVariants, buttonVariants } from '../button';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-play-button',
      utilities: [...button, 'group/play'],
      variants: buttonVariants,
    },
    restartIcon: {
      className: 'media-restart-icon',
      utilities: [...buttonIcon, 'hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100'],
      variants: buttonIconVariants,
    },
    playIcon: {
      className: 'media-play-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block',
        'group-not-data-ended/play:group-data-paused/play:opacity-100',
        'group-not-data-ended/play:group-not-data-started/play:block',
        'group-not-data-ended/play:group-not-data-started/play:opacity-100',
      ],
      variants: buttonIconVariants,
    },
    pauseIcon: {
      className: 'media-pause-icon',
      utilities: [
        ...buttonIcon,
        'hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
        'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
      ],
      variants: buttonIconVariants,
    },
  },
});
