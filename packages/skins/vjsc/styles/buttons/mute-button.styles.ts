import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-mute-button',
      utilities: 'group/mute',
    },
    offIcon: {
      className: 'media-mute-button-off-icon',
      utilities: 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100',
    },
    lowIcon: {
      className: 'media-mute-button-low-icon',
      utilities: [
        'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
        'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
      ],
    },
    highIcon: {
      className: 'media-mute-button-high-icon',
      utilities: [
        'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
        'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
      ],
    },
  },
});
