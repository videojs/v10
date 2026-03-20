import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';
import { surface as baseSurface } from './components/surface';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = cn(
  baseRoot,
  '[--media-text-color:var(--media-color-primary,oklch(0_0_0))]',
  'dark:[--media-text-color:var(--media-color-primary,oklch(1_0_0))]'
);

/* ==========================================================================
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

export const surface = cn(
  baseSurface,
  'bg-white/50 dark:bg-black/40',
  'backdrop-blur-lg backdrop-saturate-150',
  // Border and shadow
  'ring-black/5 shadow-sm shadow-black/15',
  // Border to enhance contrast on lighter pages
  'after:ring-white/10',
  // Reduced transparency for users with preference
  '[@media(prefers-reduced-transparency:reduce)]:bg-white/70 dark:[@media(prefers-reduced-transparency:reduce)]:bg-black/70',
  // High contrast mode
  'contrast-more:bg-white/90 dark:contrast-more:bg-black/90'
);

/* ==========================================================================
   Controls
   ========================================================================== */

export const controls = cn(baseControls, surface, 'text-(--media-text-color)', 'peer-data-open/error:[&_*]:invisible');

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'bg-black/10', 'dark:bg-white/20 dark:ring-1 dark:ring-black/5'),
};

/* ==========================================================================
   Popup (with audio surface)
   ========================================================================== */

export const popup = {
  ...basePopup,
  popover: cn(surface, basePopup.popover),
  tooltip: cn(surface, basePopup.tooltip),
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
  dialog: cn(
    'absolute inset-0 z-20 flex items-center gap-3 rounded-full px-5 pr-0.5',
    'bg-(--media-surface-background-color) text-(--media-text-color)',
    'backdrop-blur-lg backdrop-saturate-150',
    'transition-[opacity,filter] duration-300 delay-100 ease-out',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:blur-[4px]',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:blur-[4px]',
    'motion-reduce:duration-100 motion-reduce:delay-0'
  ),
  content: 'flex flex-1 items-center gap-2',
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { tooltipState } from '../../shared/tailwind/tooltip-state';
export { button } from './components/button';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { playbackRate } from './components/playback-rate';
export { seek } from './components/seek';
export { time } from './components/time';
