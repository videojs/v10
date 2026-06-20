/* ===========================================================================
   Icon State
   ========================================================================== */

import { cn } from '@videojs/utils/style';

export const playIcon = {
  button: 'group',
  restart: 'hidden opacity-0 group-data-ended:block group-data-ended:opacity-100',
  play: cn(
    'hidden opacity-0',
    'group-not-data-ended:group-data-paused:block',
    'group-not-data-ended:group-data-paused:opacity-100',
    'group-not-data-ended:group-not-data-started:block',
    'group-not-data-ended:group-not-data-started:opacity-100'
  ),
  pause:
    'hidden opacity-0 group-data-started:group-not-data-paused:group-not-data-ended:block group-data-started:group-not-data-paused:group-not-data-ended:opacity-100',
};

export const muteIcon = {
  button: 'group',
  volumeOff: 'hidden opacity-0 group-data-muted:block group-data-muted:opacity-100',
  volumeLow:
    'hidden opacity-0 group-not-data-muted:group-data-[volume-level=low]:block group-not-data-muted:group-data-[volume-level=low]:opacity-100',
  volumeHigh:
    'hidden opacity-0 group-not-data-muted:group-not-data-[volume-level=low]:block group-not-data-muted:group-not-data-[volume-level=low]:opacity-100',
};

export const fullscreenIcon = {
  button: 'group',
  enter: 'hidden opacity-0 group-not-data-fullscreen:block group-not-data-fullscreen:opacity-100',
  exit: 'hidden opacity-0 group-data-fullscreen:block group-data-fullscreen:opacity-100',
};

export const captionsIcon = {
  button: 'group',
  off: 'hidden opacity-0 group-not-data-active:block group-not-data-active:opacity-100',
  on: 'hidden opacity-0 group-data-active:block group-data-active:opacity-100',
};

export const pipIcon = {
  button: 'group',
  off: 'hidden opacity-0 group-not-data-pip:block group-not-data-pip:opacity-100',
  on: 'hidden opacity-0 group-data-pip:block group-data-pip:opacity-100',
};

export const castIcon = {
  button: 'group',
  enter:
    'hidden opacity-0 group-not-data-[cast-state=connected]:block group-not-data-[cast-state=connected]:opacity-100',
  exit: 'hidden opacity-0 group-data-[cast-state=connected]:block group-data-[cast-state=connected]:opacity-100',
};

export const airplayIcon = {
  // The exit SVG remains mounted while inactive, so disable its keyframes until connected.
  button: cn(
    'group',
    'not-data-[airplay-state=connected]:[--media-icon--airplay__fill-animation:none]',
    'not-data-[airplay-state=connected]:[--media-icon--airplay__triangle-animation:none]'
  ),
  enter:
    'hidden opacity-0 group-not-data-[airplay-state=connected]:block group-not-data-[airplay-state=connected]:opacity-100',
  exit: 'hidden opacity-0 group-data-[airplay-state=connected]:block group-data-[airplay-state=connected]:opacity-100',
};
