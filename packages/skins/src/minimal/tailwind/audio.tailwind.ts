import { cn } from '@videojs/utils/style';

import { container as baseContainer } from './components/container';
import { controls as baseControls } from './components/controls';
import { dialog as baseDialog } from './components/dialog';
import { popup as basePopup, tooltip } from './components/popup';
import { slider as baseSlider } from './components/slider';

/* Container */

export const container = cn(
  baseContainer,
  '[&:has(.media-error[data-open])_.media-controls_*]:invisible',
  '[--media-default-accent-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-focus-ring-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-controls-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  '[--media-controls-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-controls-border-color:light-dark(oklch(0_0_0/0.1),oklch(1_0_0/0.1))]',
  '[--media-controls-text-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-dialog-transition-duration:250ms]',
  '[--media-dialog-transition-delay:100ms]',
  '[--media-popup-transition-duration:100ms]',
  '[--media-popup-transition-timing-function:ease-out]',
  '[--media-popover-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-popover-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  '[--media-popover-border-color:oklch(0_0_0/0.1)]',
  '[--media-tooltip-backdrop-filter:var(--media-popover-backdrop-filter)]',
  '[--media-tooltip-background-color:var(--media-popover-background-color)]',
  '[--media-tooltip-border-color:var(--media-popover-border-color)]',
  '[--media-tooltip-text-color:currentColor]',
  'motion-reduce:[--media-dialog-transition-duration:50ms]',
  'motion-reduce:[--media-dialog-transition-delay:0ms]',
  'motion-reduce:[--media-popup-transition-duration:0ms]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-tooltip-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  'contrast-more:[--media-tooltip-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]'
);

/* Controls */

export const controls = cn(
  baseControls,
  // Layout
  'p-1 gap-2',
  'rounded-(--media-border-radius,0.875rem)',
  '[--media-base-side-offset:2] [--media-base-boundary-offset:2]',
  // Appearance
  'text-(--media-controls-text-color)',
  // Border
  'ring-1 ring-(color:--media-controls-border-color)'
);

export const spacer = 'grow';

export const playButton = {
  wrapper: 'group/play inline-flex relative',
  /** `peer/play-buffering` on `bufferingRoot`; merge onto the play trigger after the peer in DOM. */
  control: 'peer-data-visible/play-buffering:[&>svg]:opacity-0',
  bufferingRoot: cn(
    'peer/play-buffering',
    'absolute inset-0 z-10 hidden place-content-center pointer-events-none text-inherit',
    'not-data-visible:[--media-spinner-animation:none]',
    'data-visible:grid'
  ),
};

/* Popup */

export const popup = {
  ...basePopup,
  volume: cn(
    basePopup.popover,
    'p-0 pr-2 pl-16 [--media-popover-side-offset:0rem]',
    'bg-transparent bg-gradient-to-l from-(--media-controls-background-color) from-80% to-transparent'
  ),
};

/* Sliders */

export const slider = {
  ...baseSlider,
  value: cn(baseSlider.value, tooltip, 'bottom-10'),
};

/* Dialog */

export const dialog = {
  ...baseDialog,
  dialog: cn(
    'absolute inset-0 z-20 flex items-center gap-4 rounded-full px-5 pr-2',
    'bg-(--media-controls-background-color)',
    'transition-[opacity,filter,scale] ease-out',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'group-data-starting-style/dialog:opacity-0 group-data-starting-style/dialog:blur-xs group-data-starting-style/dialog:scale-95',
    'group-data-ending-style/dialog:opacity-0 group-data-ending-style/dialog:blur-xs group-data-ending-style/dialog:scale-95',
    'group-data-ending-style/dialog:delay-0'
  ),
  content: 'flex flex-1 items-center gap-2',
};

/* Shared components (no overrides) */

export { iconState } from '../../shared/tailwind/icon-state';
export { badge } from './components/badge';
export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { menu } from './components/menu';
export { playbackRate } from './components/playback-rate';
export { seek } from './components/seek';
export { time } from './components/time';
