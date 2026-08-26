import { cn } from '@videojs/utils/style';

import { container as baseContainer } from './components/container';
import { controls as baseControls } from './components/controls';
import { dialog as baseDialog } from './components/dialog';
import { popup as basePopup, tooltip } from './components/popup';
import { slider as baseSlider } from './components/slider';
import { surface } from './components/surface';
import { time as baseTime } from './components/time';

/* Container */

export const container = cn(
  baseContainer,
  '[&:has(.media-error[data-open])_.media-controls_*]:invisible',
  '[--media-default-accent-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-border-color:oklch(0_0_0/0.1)]',
  '[--media-focus-ring-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-text-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--media-surface-background-color:light-dark(oklch(1_0_0/0.5),oklch(0_0_0/0.4))]',
  '[--media-surface-inner-border-color:oklch(1_0_0/0.1)]',
  '[--media-surface-outer-border-color:oklch(0_0_0/0.05)]',
  '[--media-surface-shadow-color:oklch(0_0_0/0.15)]',
  '[--media-surface-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--media-dialog-transition-duration:250ms]',
  '[--media-dialog-transition-delay:100ms]',
  '[--media-popup-transition-duration:100ms]',
  '[--media-popup-transition-timing-function:ease-out]',
  'motion-reduce:[--media-dialog-transition-duration:50ms]',
  'motion-reduce:[--media-dialog-transition-delay:0ms]',
  'motion-reduce:[--media-popup-transition-duration:0ms]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  'contrast-more:[--media-surface-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-inner-border-color:light-dark(oklch(1_0_0/0.1),oklch(1_0_0/0.2))]',
  'contrast-more:[--media-surface-inner-border-color:light-dark(oklch(1_0_0/0.1),oklch(1_0_0/0.2))]',
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-outer-border-color:light-dark(oklch(0_0_0/0.05),transparent)]',
  'contrast-more:[--media-surface-outer-border-color:light-dark(oklch(0_0_0/0.05),transparent)]'
);

/* Controls */

export const controls = cn(baseControls, surface, '[--media-base-boundary-offset:2]', 'text-(--media-text-color)');

export const spacer = 'grow';

export const time = {
  ...baseTime,
  group: cn(baseTime.group, 'px-3'),
};

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

/* Sliders */

export const slider = {
  ...baseSlider,
  track: cn(
    baseSlider.track,
    '[background-color:light-dark(oklch(0_0_0/0.1),oklch(1_0_0/0.2))]',
    '[box-shadow:0_0_0_1px_light-dark(transparent,oklch(0_0_0/0.05))]'
  ),
  value: cn(baseSlider.value, surface, tooltip, 'bottom-10'),
};

/* Popup (with audio surface) */

export const popup = {
  ...basePopup,
  popover: cn(surface, basePopup.popover),
  tooltip: cn(surface, basePopup.tooltip),
};

/* Dialog (with audio surface) */

export const dialog = {
  ...baseDialog,
  dialog: cn(
    'absolute inset-0 z-20 flex items-center gap-3 rounded-full px-5 pr-0.5',
    'bg-(--media-surface-background-color) text-(--media-text-color)',
    'backdrop-blur-lg backdrop-saturate-150',
    'transition-[opacity,filter] ease-out',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'group-data-starting-style/dialog:opacity-0 group-data-starting-style/dialog:blur-xs',
    'group-data-ending-style/dialog:opacity-0 group-data-ending-style/dialog:blur-xs',
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
