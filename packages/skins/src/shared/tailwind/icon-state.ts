/* ==========================================================================
   Icon State
   ========================================================================== */

export const iconState = {
  play: {
    button: 'group',
    restart: 'hidden opacity-0 group-data-ended:block group-data-ended:opacity-100',
    play: 'hidden opacity-0 group-not-data-ended:group-data-paused:block group-not-data-ended:group-data-paused:opacity-100',
    pause:
      'hidden opacity-0 group-not-data-paused:group-not-data-ended:block group-not-data-paused:group-not-data-ended:opacity-100',
  },
  mute: {
    button: 'group',
    volumeOff: 'hidden opacity-0 group-data-muted:block group-data-muted:opacity-100',
    volumeLow:
      'hidden opacity-0 group-not-data-muted:group-data-[volume-level=low]:block group-not-data-muted:group-data-[volume-level=low]:opacity-100',
    volumeHigh:
      'hidden opacity-0 group-not-data-muted:group-not-data-[volume-level=low]:block group-not-data-muted:group-not-data-[volume-level=low]:opacity-100',
  },
  fullscreen: {
    button: 'group',
    enter: 'hidden opacity-0 group-not-data-fullscreen:block group-not-data-fullscreen:opacity-100',
    exit: 'hidden opacity-0 group-data-fullscreen:block group-data-fullscreen:opacity-100',
  },
  captions: {
    button: 'group',
    off: 'hidden opacity-0 group-not-data-active:block group-not-data-active:opacity-100',
    on: 'hidden opacity-0 group-data-active:block group-data-active:opacity-100',
  },
  pip: {
    button: 'group',
    off: 'hidden opacity-0 group-not-data-pip:block group-not-data-pip:opacity-100',
    on: 'hidden opacity-0 group-data-pip:block group-data-pip:opacity-100',
  },
};
