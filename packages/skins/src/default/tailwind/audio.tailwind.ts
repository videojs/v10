import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { slider as baseSlider } from './components/slider';
import { surface as baseSurface } from './components/surface';

/* ==========================================================================
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

export const surface = cn(
  baseSurface,
  'bg-white/50 dark:bg-black/40',
  'backdrop-brightness-98 backdrop-saturate-120 backdrop-blur',
  // Border and shadow
  'ring-white/5 shadow-black/15',
  // Border to enhance contrast on lighter pages
  'after:ring-black/5'
);

/* ==========================================================================
   Controls
   ========================================================================== */

export const controls = cn(baseControls, surface, 'dark:text-white');

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'bg-black/10', 'dark:bg-white/20 dark:shadow-[0_0_0_1px_oklch(0_0_0/0.05)]'),
};

/* ==========================================================================
   Icon State (audio: play + mute only)
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
};

/* ==========================================================================
   Popup (with audio surface)
   ========================================================================== */

export const popup = {
  ...basePopup,
  base: cn(basePopup.base, surface),
};

/* ==========================================================================
   Buffering (with audio surface)
   ========================================================================== */

export const bufferingIndicator = {
  ...baseBufferingIndicator,
  container: cn(baseBufferingIndicator.container, surface),
};

/* ==========================================================================
   Error (with audio surface)
   ========================================================================== */

export const error = {
  ...baseError,
  dialog: cn(baseError.dialog, surface),
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { button } from './components/button';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { playbackRate } from './components/playback-rate';
export { root } from './components/root';
export { seek } from './components/seek';
export { time } from './components/time';
