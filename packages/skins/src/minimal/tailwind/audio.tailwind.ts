import { cn } from '@videojs/utils/style';
import { container as baseContainer } from './components/container';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { slider as baseSlider } from './components/slider';

/* Container */

export const container = cn(
  baseContainer,
  '[--default-accent-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--focus-ring-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--controls-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  '[--controls-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--controls-border-color:light-dark(oklch(0_0_0/0.1),oklch(1_0_0/0.1))]',
  '[--controls-text-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
  '[--error-dialog-transition-duration:250ms]',
  '[--error-dialog-transition-delay:100ms]',
  '[--popup-transition-duration:100ms]',
  '[--popup-transition-timing-function:ease-out]',
  '[--popover-backdrop-filter:blur(16px)_saturate(1.5)]',
  '[--popover-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  '[--popover-border-color:oklch(0_0_0/0.1)]',
  '[--tooltip-backdrop-filter:var(--popover-backdrop-filter)]',
  '[--tooltip-background-color:var(--popover-background-color)]',
  '[--tooltip-border-color:var(--popover-border-color)]',
  '[--tooltip-text-color:currentColor]',
  'motion-reduce:[--error-dialog-transition-duration:50ms]',
  'motion-reduce:[--error-dialog-transition-delay:0ms]',
  'motion-reduce:[--popup-transition-duration:0ms]',
  '[@media(prefers-reduced-transparency:reduce)]:[--tooltip-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]',
  'contrast-more:[--tooltip-background-color:light-dark(oklch(1_0_0),oklch(0_0_0))]'
);

/* Controls */

export const controls = cn(
  baseControls,
  // Layout
  'p-1 gap-2',
  'rounded-(--media-border-radius,0.875rem)',
  '[--base-side-offset:2] [--base-boundary-offset:2]',
  'peer-data-open/error:**:invisible',
  // Appearance
  'text-(--controls-text-color)',
  // Border
  'ring-1 ring-(color:--controls-border-color)'
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
    'bg-transparent bg-gradient-to-l from-(--controls-background-color) from-80% to-transparent'
  ),
};

/* Sliders */

export const slider = {
  ...baseSlider,
  value: cn(baseSlider.value, 'bottom-10'),
};

/* Error */

export const error = {
  ...baseError,
  dialog: cn(
    'absolute inset-0 z-20 flex items-center gap-4 rounded-full px-5 pr-2',
    'bg-(--controls-background-color)',
    'transition-[opacity,filter,scale] ease-out',
    'duration-(--error-dialog-transition-duration)',
    'delay-(--error-dialog-transition-delay)',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:blur-xs group-data-starting-style/error:scale-95',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:blur-xs group-data-ending-style/error:scale-95',
    'group-data-ending-style/error:delay-0'
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
