import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-mute-button',
  rules: {
    root: {
      utilities: 'group/mute',
    },
    offIcon: {
      utilities: 'opacity-0 group-data-muted/mute:scale-100 group-data-muted/mute:opacity-100',
    },
    lowIcon: {
      utilities: [
        'opacity-0',
        'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
        'group-not-data-muted/mute:group-data-[volume-level=low]/mute:scale-100',
      ],
    },
    highIcon: {
      utilities: [
        'opacity-0',
        'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
        'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:scale-100',
      ],
    },
  },
});
