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
  '[--media-controls-border-color:oklch(0_0_0/0.1)]',
  '[--media-controls-padding:0.375rem]',
  '[--media-text-color:var(--media-color-primary,oklch(0_0_0))]',
  'dark:[--media-controls-background-color:oklch(0_0_0)]',
  'dark:[--media-controls-border-color:oklch(1_0_0/0.1)]',
  'dark:[--media-text-color:var(--media-color-primary,oklch(1_0_0))]'
);

/* ==========================================================================
   Controls
   ========================================================================== */

export const controls = cn(
  baseControls,
  // Layout
  'gap-2 p-1.5',
  'peer-data-open/error:[&_*]:invisible',
  // Appearance
  'rounded-(--media-border-radius,0.75rem)',
  'bg-(--media-controls-background-color)',
  'text-(--media-text-color)',
  // Backdrop filter
  'backdrop-blur backdrop-brightness-[0.98] backdrop-saturate-[1.2]',
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
    'py-2 pr-0 pl-16',
    'bg-transparent bg-gradient-to-l from-(--media-controls-background-color) from-80% to-transparent',
    '[--media-popover-side-offset:0.75rem]'
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
    'transition-[opacity,filter,scale] duration-300 delay-100 ease-out',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:blur-[4px] group-data-starting-style/error:scale-95',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:blur-[4px] group-data-ending-style/error:scale-95',
    'motion-reduce:duration-100 motion-reduce:delay-0'
  ),
  content: 'flex flex-1 items-center gap-2',
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { tooltipState } from '../../shared/tailwind/tooltip-state';
export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { seek } from './components/seek';
export { slider } from './components/slider';
export { time } from './components/time';
