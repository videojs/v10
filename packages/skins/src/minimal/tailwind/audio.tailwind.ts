import { cn } from '@videojs/utils/style';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { root as baseRoot } from './components/root';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = cn(
  baseRoot,
  '[--media-controls-background-color:oklch(1_0_0)]',
  '[--media-controls-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-controls-border-color:oklch(0_0_0/0.05)]',
  '[--media-controls-text-color:var(--media-color-primary,oklch(0_0_0))]',
  '[--media-error-dialog-transition-duration:250ms]',
  '[--media-error-dialog-transition-delay:100ms]',
  '[--media-popup-transition-duration:100ms]',
  '[--media-popup-transition-timing-function:ease-out]',
  '[--media-tooltip-background-color:oklch(1_0_0/0.1)]',
  '[--media-tooltip-border-color:oklch(0_0_0/0.05)]',
  '[--media-tooltip-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-tooltip-text-color:currentColor]',
  '[--media-tooltip-side-offset:0.75rem]',
  '[--media-popover-side-offset:0.75rem]',
  'motion-reduce:[--media-error-dialog-transition-duration:50ms]',
  'motion-reduce:[--media-error-dialog-transition-delay:0ms]',
  'motion-reduce:[--media-popup-transition-duration:0ms]',
  'dark:[--media-controls-background-color:oklch(0_0_0)]',
  'dark:[--media-controls-border-color:oklch(1_0_0/0.1)]',
  'dark:[--media-controls-text-color:var(--media-color-primary,oklch(1_0_0))]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-tooltip-background-color:oklch(1_0_0)]',
  'contrast-more:[--media-tooltip-background-color:oklch(1_0_0)]',
  'dark:[@media(prefers-reduced-transparency:reduce)]:[--media-tooltip-background-color:oklch(0_0_0)]',
  'dark:contrast-more:[--media-tooltip-background-color:oklch(0_0_0)]'
);

/* ==========================================================================
   Controls
   ========================================================================== */

export const controls = cn(
  baseControls,
  // Layout
  'p-1.5 gap-2',
  'rounded-(--media-border-radius,1rem)',
  'peer-data-open/error:[&_*]:invisible',
  // Appearance
  'text-(--media-controls-text-color)',
  // Border
  'ring-1 ring-(color:--media-controls-border-color)'
);

/* ==========================================================================
   Popup
   ========================================================================== */

export const popup = {
  ...basePopup,
  volume: cn(
    basePopup.popover,
    'p-0 pl-16',
    'bg-transparent bg-gradient-to-l from-(--media-controls-background-color) from-80% to-transparent'
  ),
};

/* ==========================================================================
   Error
   ========================================================================== */

export const error = {
  ...baseError,
  dialog: cn(
    'absolute inset-0 z-20 flex items-center gap-4 rounded-full px-5 pr-2',
    'bg-(--media-controls-background-color)',
    'transition-[opacity,filter,scale] ease-out',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:blur-xs group-data-starting-style/error:scale-95',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:blur-xs group-data-ending-style/error:scale-95',
    'group-data-ending-style/error:delay-0'
  ),
  content: 'flex flex-1 items-center gap-2',
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { liveButton } from './components/live-button';
export { seek } from './components/seek';
export { slider } from './components/slider';
export { time } from './components/time';
