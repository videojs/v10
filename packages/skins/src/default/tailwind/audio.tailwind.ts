import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';
import { surface } from './components/surface';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = cn(
  baseRoot,
  '[--media-text-color:var(--media-color-primary,oklch(0_0_0))]',
  '[--media-surface-background-color:oklch(1_0_0/0.5)]',
  '[--media-surface-inner-border-color:oklch(1_0_0/0.1)]',
  '[--media-surface-outer-border-color:oklch(0_0_0/0.05)]',
  '[--media-surface-shadow-color:oklch(0_0_0/0.15)]',
  '[--media-surface-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-error-dialog-transition-duration:250ms]',
  '[--media-error-dialog-transition-delay:100ms]',
  '[--media-popup-transition-duration:100ms]',
  '[--media-popup-transition-timing-function:ease-out]',
  '[--media-tooltip-side-offset:0.75rem]',
  '[--media-popover-side-offset:0.75rem]',
  'motion-reduce:[--media-error-dialog-transition-duration:50ms]',
  'motion-reduce:[--media-error-dialog-transition-delay:0ms]',
  'motion-reduce:[--media-popup-transition-duration:0ms]',
  'dark:[--media-surface-background-color:oklch(0_0_0/0.4)]',
  'dark:[--media-text-color:var(--media-color-primary,oklch(1_0_0))]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(1_0_0)]',
  'contrast-more:[--media-surface-background-color:oklch(1_0_0)]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-outer-border-color:oklch(0_0_0/0.05)]',
  'contrast-more:[--media-surface-outer-border-color:oklch(0_0_0/0.05)]',
  'dark:[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)]',
  'dark:contrast-more:[--media-surface-background-color:oklch(0_0_0)]',
  'dark:[@media(prefers-reduced-transparency:reduce)]:[--media-surface-inner-border-color:oklch(1_0_0/0.2)]',
  'dark:contrast-more:[--media-surface-inner-border-color:oklch(1_0_0/0.2)]',
  'dark:[@media(prefers-reduced-transparency:reduce)]:[--media-surface-outer-border-color:transparent]',
  'dark:contrast-more:[--media-surface-outer-border-color:transparent]'
);

/* ==========================================================================
   Controls
   ========================================================================== */

export const controls = cn(baseControls, surface, 'text-(--media-text-color)', 'peer-data-open/error:**:invisible');

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
    'transition-[opacity,filter] ease-out',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:blur-xs',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:blur-xs',
    'group-data-ending-style/error:delay-0'
  ),
  content: 'flex flex-1 items-center gap-2',
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { playbackRate } from './components/playback-rate';
export { seek } from './components/seek';
export { time } from './components/time';
