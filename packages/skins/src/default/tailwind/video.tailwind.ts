import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { buttonGroup as baseButtonGroup } from './components/button-group';
import { container as baseContainer } from './components/container';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { menu as baseMenu } from './components/menu';
import { popup as basePopup } from './components/popup';
import { slider as baseSlider } from './components/slider';
import { statusIndicator as baseStatusIndicator } from './components/status-indicator';
import { surface } from './components/surface';
import { thumbnail as baseThumbnail } from './components/thumbnail';
import { time as baseTime } from './components/time';
import { volumeIndicator as baseVolumeIndicator } from './components/volume-indicator';

/* Container */

export const container = (isShadowDOM: boolean) =>
  cn(
    baseContainer,
    'group/skin',
    'bg-black overflow-clip',
    // Inner border ring
    'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
    '[&:fullscreen]:after:hidden',
    'after:inset-0 after:ring-1 after:ring-inset after:ring-(color:--border-color)',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--container-border-radius) [&_::slotted(video)]:[object-fit:var(--media-object-fit,contain)] [&_::slotted(video)]:[object-position:var(--media-object-position,center)]':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]':
        !isShadowDOM,
    },
    '[--default-accent-color:oklch(1_0_0)]',
    '[--border-color:light-dark(oklch(0_0_0/0.1),oklch(1_0_0/0.15))]',
    '[--focus-ring-color:light-dark(oklch(0_0_0),oklch(1_0_0))]',
    '[--container-border-radius:var(--media-border-radius,1.75rem)]',
    '[--media-video-border-radius:var(--container-border-radius)]',
    '[--controls-transition-duration:100ms]',
    '[--controls-transition-timing-function:ease-out]',
    '[--error-dialog-transition-duration:350ms]',
    '[--error-dialog-transition-delay:100ms]',
    '[--error-dialog-transition-timing-function:ease-out]',
    '[--popup-transition-duration:100ms]',
    '[--popup-transition-timing-function:ease-out]',
    '[--surface-background-color:oklch(1_0_0/0.1)]',
    '[--surface-inner-border-color:oklch(1_0_0/0.1)]',
    '[--surface-outer-border-color:oklch(0_0_0/0.1)]',
    '[--surface-shadow-color:oklch(0_0_0/0.15)]',
    '[--surface-backdrop-filter:blur(16px)_saturate(1.5)]',
    // Fullscreen scale
    'min-[1280px]:[&:fullscreen]:[--scale:1.25]',
    'min-[1536px]:[&:fullscreen]:[--scale:1.5]',
    'min-[1920px]:[&:fullscreen]:[--scale:1.75]',
    'motion-reduce:[--error-dialog-transition-duration:50ms]',
    'motion-reduce:[--error-dialog-transition-delay:0ms]',
    'motion-reduce:[--error-dialog-transition-timing-function:ease-out]',
    'motion-reduce:[--popup-transition-duration:0ms]',
    '[@media(prefers-reduced-transparency:reduce)]:[--surface-background-color:oklch(0_0_0)]',
    'contrast-more:[--surface-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--surface-inner-border-color:oklch(1_0_0/0.25)]',
    'contrast-more:[--surface-inner-border-color:oklch(1_0_0/0.25)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--surface-outer-border-color:transparent]',
    'contrast-more:[--surface-outer-border-color:transparent]',
    'pointer-fine:has-[[data-controls]:not([data-visible])]:[--controls-transition-duration:300ms]',
    'pointer-coarse:has-[[data-controls]:not([data-visible])]:[--controls-transition-duration:150ms]',
    'motion-reduce:has-[[data-controls]:not([data-visible])]:[--controls-transition-duration:50ms]',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:--spacing(-2)]',
    '[--media-caption-track-delay:25ms]',
    '[--media-caption-track-duration:var(--controls-transition-duration)]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:--spacing(-14)]',
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
    // Poster placeholder (blur-up) — React path only; HTML path uses media-poster::before
    !isShadowDOM
      ? [
          'before:absolute before:inset-0 before:pointer-events-none',
          'before:[background-image:var(--media-poster-placeholder,none)]',
          'before:bg-no-repeat',
          'before:[background-position:var(--media-object-position,center)]',
          'before:[background-size:var(--media-object-fit,contain)]',
          'before:opacity-0 before:[filter:blur(var(--media-poster-placeholder-blur,20px))]',
          'before:transition-opacity before:duration-250',
          'has-[img[data-visible]:not([data-loaded])]:before:opacity-100',
        ]
      : [],
    // Fullscreen
    '[&:fullscreen]:[--container-border-radius:0]',
    {
      '[&:fullscreen_video]:object-contain': !isShadowDOM,
      '[&:fullscreen_::slotted(video)]:object-contain': isShadowDOM,
    }
  );

/* Controls (hide/show behavior) */

const controlsBase = cn(
  baseControls,
  surface,
  'text-white z-10',
  'peer-data-open/error:hidden!',
  'ease-(--controls-transition-timing-function)',
  'duration-[calc(var(--controls-transition-duration)/2)]',
  'pointer-fine:will-change-[filter,opacity,scale,translate]',
  'pointer-fine:transition-[filter,opacity,scale,translate]',
  'pointer-coarse:will-change-[opacity,scale,translate]',
  'pointer-coarse:transition-[opacity,scale,translate]',
  '@2xl/media-root:[--base-boundary-offset:3]'
);

export const controls = cn(
  controlsBase,
  'group/controls contents! after:hidden',
  '@lg/media-root:absolute @lg/media-root:flex!',
  '@lg/media-root:bottom-2 @lg/media-root:inset-x-2',
  '@2xl/media-root:bottom-3 @2xl/media-root:inset-x-3',
  '@lg/media-root:after:block @lg/media-root:origin-bottom',
  // Hidden state (large)
  '@lg/media-root:not-data-visible:pointer-events-none',
  '@lg/media-root:not-data-visible:opacity-0',
  '@lg/media-root:not-data-visible:duration-(--controls-transition-duration)',
  '@lg/media-root:motion-safe:not-data-visible:scale-95',
  '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
  '@lg/media-root:motion-safe:not-data-visible:translate-y-1'
);

const splitControls = cn(
  controlsBase,
  'absolute @max-lg/media-root:duration-[inherit] @max-lg/media-root:ease-[inherit]',
  '@lg/media-root:contents! @lg/media-root:after:hidden',
  '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
  '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
  '@max-lg/media-root:group-[:not([data-visible])]/controls:duration-(--controls-transition-duration)',
  '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
  '@max-lg/media-root:pointer-fine:motion-safe:group-[:not([data-visible])]/controls:blur-sm'
);

export const primaryControls = cn(
  splitControls,
  'bottom-2 inset-x-2 origin-bottom',
  '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1'
);

export const secondaryControls = cn(
  splitControls,
  'top-2 right-2 origin-top @container-normal',
  '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1'
);

/* Button groups */

export const buttonGroupStart = baseButtonGroup;
export const buttonGroupEnd = baseButtonGroup;

export const spacer = 'grow';

/* Time */

export const time = {
  ...baseTime,
  group: cn(baseTime.group, 'px-3'),
};

/* Thumbnail (with video surface) */

export const thumbnail = {
  ...baseThumbnail,
  root: cn(baseThumbnail.root, surface),
};

/* Sliders */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'bg-white/20'),
};

/* Popup (with video surface) */

export const popup = {
  ...basePopup,
  popover: cn(surface, basePopup.popover),
  tooltip: cn(surface, basePopup.tooltip),
};

/* Menu */

export const menu = {
  ...baseMenu,
  root: baseMenu.root,
  settings: baseMenu.settings,
};

/* Buffering */

export const bufferingIndicator = baseBufferingIndicator;

/* Error (with video surface) */

export const error = {
  ...baseError,
  dialog: cn(baseError.dialog, surface, 'w-full text-shadow-2xs text-shadow-black/25'),
  content: cn(baseError.content, 'text-shadow-inherit'),
  title: cn(baseError.title, 'text-(length:--font-size-medium)'),
};

/* Input indicators (top indicators use video surface) */

export const volumeIndicator = {
  ...baseVolumeIndicator,
  root: cn(baseVolumeIndicator.root, surface),
};

export const statusIndicator = {
  ...baseStatusIndicator,
  root: cn(baseStatusIndicator.root, surface),
};

/* Shared components (no overrides) */

export { iconState } from '../../shared/tailwind/icon-state';
export { badge } from './components/badge';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { inputIndicatorOverlay } from './components/input-indicator-overlay';
export { overlay } from './components/overlay';
export { playbackRate } from './components/playback-rate';
export { poster } from './components/poster';
export { seek } from './components/seek';
export { seekIndicator } from './components/seek-indicator';
