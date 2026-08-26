import { cn } from '@videojs/utils/style';

import { buttonGroup as baseButtonGroup } from './components/button-group';
import { container as baseContainer } from './components/container';
import { controls as baseControls } from './components/controls';
import { dialog as baseDialog } from './components/dialog';
import { menu as baseMenu } from './components/menu';
import { popup as basePopup } from './components/popup';
import { slider as baseSlider } from './components/slider';
import { thumbnail as baseThumbnail } from './components/thumbnail';
import { time as baseTime } from './components/time';

/* Container */

export const container = (isShadowDOM: boolean) =>
  cn(
    baseContainer,
    'group/skin',
    'bg-black overflow-clip',
    '[&:has(.media-buffering-indicator[data-visible])_.media-controls-backdrop]:bg-black/35',
    '[&:has(.media-buffering-indicator[data-visible])_.media-controls-backdrop]:opacity-100',
    '[&:has(.media-buffering-indicator[data-visible])_.media-controls-backdrop]:backdrop-blur-sm',
    '[&:has(.media-error[data-open])_.media-controls]:hidden',
    // Border ring (::after)
    'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
    '[&:fullscreen]:after:hidden',
    'after:inset-0 after:ring-1 after:ring-inset after:ring-(color:--media-border-color)',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-container-border-radius) [&_::slotted(video)]:[object-fit:var(--media-object-fit,cover)] [&_::slotted(video)]:[object-position:var(--media-object-position,center)]':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]':
        !isShadowDOM,
    },
    '[--media-default-accent-color:oklch(1_0_0)]',
    '[--media-border-color:light-dark(oklch(0_0_0/0.15),oklch(1_0_0/0.15))]',
    '[--media-focus-ring-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
    '**:[--media-focus-ring-color:oklch(1_0_0)]',
    '[--media-container-border-radius:var(--media-border-radius,0.75rem)]',
    '[--media-video-border-radius:var(--media-container-border-radius)]',
    '[--media-controls-background-color:transparent]',
    '[--media-controls-transition-duration:100ms]',
    '[--media-controls-transition-timing-function:ease-out]',
    '[--media-dialog-transition-duration:150ms]',
    '[--media-dialog-transition-delay:100ms]',
    '[--media-dialog-transition-timing-function:ease-out]',
    '[--media-popup-transition-duration:100ms]',
    '[--media-popup-transition-timing-function:ease-out]',
    '[--media-popover-backdrop-filter:blur(16px)_saturate(1.5)]',
    '[--media-popover-background-color:oklch(0_0_0/0.5)]',
    '[--media-popover-border-color:oklch(1_0_0/0.1)]',
    '[--media-tooltip-backdrop-filter:var(--media-popover-backdrop-filter)]',
    '[--media-tooltip-background-color:var(--media-popover-background-color)]',
    '[--media-tooltip-border-color:var(--media-popover-border-color)]',
    '[--media-tooltip-text-color:currentColor]',
    // Fullscreen scale
    'min-[1280px]:[&:fullscreen]:[--media-scale:1.25]',
    'min-[1536px]:[&:fullscreen]:[--media-scale:1.5]',
    'min-[1920px]:[&:fullscreen]:[--media-scale:1.75]',
    'motion-reduce:[--media-dialog-transition-duration:50ms]',
    'motion-reduce:[--media-dialog-transition-delay:0ms]',
    'motion-reduce:[--media-popup-transition-duration:0ms]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-controls-background-color:oklch(0_0_0)]',
    'contrast-more:[--media-controls-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-tooltip-background-color:oklch(0_0_0)]',
    'contrast-more:[--media-tooltip-background-color:oklch(0_0_0)]',
    'pointer-fine:has-[.media-controls:not([data-visible])]:[--media-controls-transition-duration:300ms]',
    'pointer-coarse:has-[.media-controls:not([data-visible])]:[--media-controls-transition-duration:150ms]',
    'motion-reduce:has-[.media-controls:not([data-visible])]:[--media-controls-transition-duration:50ms]',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:--spacing(-2)]',
    '[--media-caption-track-delay:25ms]',
    '[--media-caption-track-duration:var(--media-controls-transition-duration)]',
    'has-[.media-controls[data-visible]]:[--media-caption-track-y:--spacing(-18)]',
    '@2xl/media-root:has-[.media-controls[data-visible]]:*:[--media-caption-track-y:--spacing(-12)]',
    // Native caption track container
    !isShadowDOM
      ? [
          '[&_video::-webkit-media-text-track-container]:transition-[translate]',
          '[&_video::-webkit-media-text-track-container]:duration-(--media-caption-track-duration)',
          '[&_video::-webkit-media-text-track-container]:ease-out',
          '[&_video::-webkit-media-text-track-container]:delay-(--media-caption-track-delay)',
          '[&_video::-webkit-media-text-track-container]:translate-y-(--media-caption-track-y)',
          '[&_video::-webkit-media-text-track-container]:scale-98',
          '[&_video::-webkit-media-text-track-container]:z-1',
          '[&_video::-webkit-media-text-track-container]:font-[inherit]',
        ]
      : [],
    // Fullscreen
    '[&:fullscreen]:[--media-container-border-radius:0]',
    {
      '[&:fullscreen_video]:object-contain': !isShadowDOM,
      '[&:fullscreen_::slotted(video)]:object-contain': isShadowDOM,
    }
  );

/* Controls (hide/show behavior) */

export const controls = cn(
  baseControls,
  // Position & wrapping layout (small)
  'absolute bottom-1 inset-x-1',
  '[--media-base-side-offset:5] [--media-base-boundary-offset:1]',
  '[--media-volume-mask:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
  'gap-x-2 flex-wrap rounded-[--spacing(3)] group/controls',
  'text-white z-20',
  'ease-(--media-controls-transition-timing-function)',
  'duration-[calc(var(--media-controls-transition-duration)/2)]',
  'not-data-visible:duration-(--media-controls-transition-duration)',
  'pointer-fine:transition-[translate,filter,opacity]',
  'pointer-coarse:transition-[translate,opacity]',
  // Hidden state
  'not-data-visible:opacity-0 not-data-visible:pointer-events-none',
  'motion-safe:not-data-visible:translate-y-full',
  'pointer-fine:motion-safe:not-data-visible:blur-sm',
  // Single-row layout (large)
  '@2xl/media-root:flex-nowrap @2xl/media-root:[--media-controls-padding:2] @2xl/media-root:[--media-base-side-offset:2]'
);

/* Button groups */

const volumeMaskTarget = cn(
  '[mask-image:var(--media-volume-mask-image,none)]',
  '[mask-repeat:no-repeat]',
  '[mask-position:var(--media-volume-mask-position,100%_0)]',
  '[mask-size:var(--media-volume-mask-size,200%_100%)]',
  '[transition:mask-position_50ms_ease-out]'
);

export const buttonGroupStart = cn(baseButtonGroup, 'flex-1 @2xl/media-root:flex-none');
export const buttonGroupEnd = cn(
  baseButtonGroup,
  volumeMaskTarget,
  'flex-1 justify-end @2xl/media-root:flex-none',
  'group-has-[[data-volume-level][aria-expanded=true]]/controls:@max-2xl/media-root:[--media-volume-mask-image:var(--media-volume-mask)]',
  'group-has-[[data-volume-level][aria-expanded=true]]/controls:@max-2xl/media-root:[--media-volume-mask-position:0_0]',
  'group-has-[[data-volume-level][aria-expanded=true]]/controls:@max-2xl/media-root:[--media-volume-mask-size:400%_100%]'
);

export const spacer = 'grow';

/* Time */

export const time = {
  ...baseTime,
  controls: cn(
    baseTime.controls,
    volumeMaskTarget,
    '[--media-slider-height:--spacing(5)] grow-0 shrink-0 basis-full order-[-1] px-1.5',
    '@2xl/media-root:[--media-slider-height:--spacing(8)] @2xl/media-root:grow @2xl/media-root:shrink @2xl/media-root:basis-0 @2xl/media-root:order-[unset]',
    'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[--media-volume-mask-image:var(--media-volume-mask)]',
    'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[--media-volume-mask-position:0_0]'
  ),
};

/* Dialog */

export const dialog = {
  ...baseDialog,
  popup: cn(baseDialog.popup, 'w-full max-w-64 rounded-none outline-none'),
  content: cn(baseDialog.content, 'p-0 py-1.5'),
  title: 'text-(length:--media-font-size-medium)',
};

/* Thumbnail */

export const thumbnail = baseThumbnail;

/* Sliders */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'ring-1 ring-black/5'),
  value: cn(baseSlider.value, 'px-3 text-shadow-2xs text-shadow-(color:--media-shadow-current-color)'),
  preview: cn(
    baseSlider.preview,
    '[--media-preview-end-inset:calc(100cqi-100%)]',
    '[--media-preview-left:clamp(calc(var(--media-max-size)/2),var(--media-slider-pointer),calc(100%-var(--media-max-size)/2+var(--media-preview-end-inset)))]',
    '@2xl/media-root:[--media-preview-left:var(--media-slider-pointer)]'
  ),
};

/* Popup */

export const popup = {
  ...basePopup,
  volume: cn(basePopup.popover, 'p-0 px-3 bg-transparent [--media-popover-side-offset:0rem]'),
};

/* Menu */

export const menu = {
  ...baseMenu,
  root: baseMenu.root,
  settings: baseMenu.settings,
};

/* Shared components (no overrides) */

export { iconState } from '../../shared/tailwind/icon-state';
export { controlsBackdrop } from './components/controls-backdrop';
export { badge } from './components/badge';
export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { inputIndicator } from './components/input-indicator';
export { playbackRate } from './components/playback-rate';
export { poster } from './components/poster';
export { seek } from './components/seek';
export { seekIndicator } from './components/seek-indicator';
export { statusIndicator } from './components/status-indicator';
export { volumeIndicator } from './components/volume-indicator';
