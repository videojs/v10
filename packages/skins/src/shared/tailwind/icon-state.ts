/* ==========================================================================
   Icon State

   Data-attribute-driven visibility rules for multi-state icon buttons shared
   by the HTML and React skins.
   ========================================================================== */

export const iconState = {
  play: {
    button: 'group',
    restart: 'opacity-0 scale-0 group-data-ended:opacity-100 group-data-ended:scale-100',
    play: [
      'opacity-0 scale-0',
      'group-not-data-ended:group-data-paused:opacity-100',
      'group-not-data-ended:group-data-paused:scale-100',
      'group-not-data-ended:group-not-data-started:opacity-100',
      'group-not-data-ended:group-not-data-started:scale-100',
    ].join(' '),
    pause:
      'opacity-0 scale-0 group-data-started:group-not-data-paused:group-not-data-ended:opacity-100 group-data-started:group-not-data-paused:group-not-data-ended:scale-100',
  },
  mute: {
    button: 'group',
    volumeOff: 'opacity-0 group-data-muted:opacity-100 group-data-muted:scale-100',
    volumeLow:
      'opacity-0 group-not-data-muted:group-data-[volume-level=low]:opacity-100 group-not-data-muted:group-data-[volume-level=low]:scale-100',
    volumeHigh:
      'opacity-0 group-not-data-muted:group-not-data-[volume-level=low]:opacity-100 group-not-data-muted:group-not-data-[volume-level=low]:scale-100',
  },
  fullscreen: {
    button: 'group',
    enter: 'opacity-0 group-not-data-fullscreen:opacity-100 group-not-data-fullscreen:scale-100',
    exit: 'opacity-0 group-data-fullscreen:opacity-100 group-data-fullscreen:scale-100',
  },
  captions: {
    button: 'group',
    off: 'opacity-0 group-not-data-active:opacity-100 group-not-data-active:scale-100',
    on: 'opacity-0 group-data-active:opacity-100 group-data-active:scale-100',
  },
  pip: {
    button: 'group',
    off: 'opacity-0 group-not-data-pip:opacity-100 group-not-data-pip:scale-100',
    on: 'opacity-0 group-data-pip:opacity-100 group-data-pip:scale-100',
  },
  cast: {
    button: 'group',
    enter:
      'opacity-0 group-not-data-[cast-state=connected]:opacity-100 group-not-data-[cast-state=connected]:scale-100',
    exit: 'opacity-0 group-data-[cast-state=connected]:opacity-100 group-data-[cast-state=connected]:scale-100',
  },
  airplay: {
    // `group` enables the icon-state variants below. The two CSS-variable
    // overrides mirror the spinner pattern: the airplay-exit SVG stays in
    // the DOM while inactive, so we short-circuit its keyframes by setting
    // the animation variables to `none` whenever airplay isn't connected.
    button: [
      'group',
      'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
      'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
      'motion-reduce:[--media-icon-airplay-fill-animation:none]',
      'motion-reduce:[--media-icon-airplay-triangle-animation:none]',
    ].join(' '),
    enter:
      'opacity-0 group-not-data-[airplay-state=connected]:opacity-100 group-not-data-[airplay-state=connected]:scale-100',
    exit: 'opacity-0 group-data-[airplay-state=connected]:opacity-100 group-data-[airplay-state=connected]:scale-100',
  },
};
