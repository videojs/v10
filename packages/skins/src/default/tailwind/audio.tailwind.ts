import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';

/* ==========================================================================
   Surface (audio glass effect)
   ========================================================================== */

export const surface = cn(
  // Background
  'bg-white/50 dark:bg-black/40',
  // Backdrop filter
  'backdrop-blur backdrop-brightness-[0.98] backdrop-saturate-[1.2]',
  // Inner border ring + outer border + depth shadows
  // 'shadow-[inset_0_0_0_1px_var(--tw-shadow-color),inset_0_1px_0_0_var(--tw-shadow-color),0_0_0_1px_var(--tw-ring-shadow-color),0_1px_3px_oklch(0_0_0/0.1),0_1px_2px_-1px_oklch(0_0_0/0.15)]',
  // '[--tw-shadow-color:oklch(1_0_0/0.2)] dark:[--tw-shadow-color:oklch(1_0_0/0.075)]',
  // '[--tw-ring-shadow-color:oklch(0_0_0/0.05)] dark:[--tw-ring-shadow-color:oklch(0_0_0/0.5)]',
  'shadow-sm shadow-black/15 ring-1 ring-black/5 dark:ring-white/10',
  'after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-white/10',
  // Reduced transparency
  '[@media(prefers-reduced-transparency:reduce)]:bg-white/70 dark:[@media(prefers-reduced-transparency:reduce)]:bg-black/70',
  // High contrast
  'contrast-more:bg-white/90 dark:contrast-more:bg-black/90'
);

/* ==========================================================================
   Root
   ========================================================================== */

export const root = cn(
  baseRoot
  // Outer border ring (::after)
  // 'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
  // 'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10'
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
export { seek } from './components/seek';
export { time } from './components/time';
