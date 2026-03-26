import { cn } from '@videojs/utils/style';
import { buttonGroup as baseButtonGroup } from './components/button-group';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { preview as basePreview } from './components/preview';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';
import { time as baseTime } from './components/time';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = (isShadowDOM: boolean) =>
  cn(
    baseRoot,
    'bg-black overflow-clip',
    // Border ring (::after)
    'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
    'after:inset-0 after:ring-1 after:ring-inset after:ring-black/15 dark:after:ring-white/15',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-video-border-radius) [&_::slotted(video)]:[object-fit:var(--media-object-fit,cover)] [&_::slotted(video)]:[object-position:var(--media-object-position,center)]':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]':
        !isShadowDOM,
    },
    '[--media-video-border-radius:var(--media-border-radius,0.75rem)]',
    '[--media-controls-background-color:transparent]',
    '[--media-controls-transition-duration:100ms]',
    '[--media-controls-transition-timing-function:ease-out]',
    '[--media-error-dialog-transition-duration:250ms]',
    '[--media-error-dialog-transition-delay:100ms]',
    '[--media-error-dialog-transition-timing-function:ease-out]',
    '[--media-popup-transition-duration:100ms]',
    '[--media-popup-transition-timing-function:ease-out]',
    '[--media-tooltip-background-color:oklch(1_0_0/0.1)]',
    '[--media-tooltip-border-color:transparent]',
    '[--media-tooltip-backdrop-filter:blur(16px)_saturate(1.5)]',
    '[--media-tooltip-text-color:currentColor]',
    '[--media-tooltip-side-offset:0.5rem]',
    '[--media-popover-side-offset:1.5rem]',
    'motion-reduce:[--media-error-dialog-transition-duration:50ms]',
    'motion-reduce:[--media-error-dialog-transition-delay:0ms]',
    'motion-reduce:[--media-popup-transition-duration:0ms]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-controls-background-color:oklch(0_0_0)]',
    'contrast-more:[--media-controls-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-tooltip-background-color:oklch(0_0_0)]',
    'contrast-more:[--media-tooltip-background-color:oklch(0_0_0)]',
    '@2xl/media-root:[&>*]:[--media-popover-side-offset:0rem]',
    '[@media(pointer:fine)]:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:300ms]',
    '[@media(pointer:coarse)]:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:150ms]',
    'motion-reduce:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:50ms]',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:-0.5rem]',
    '[--media-caption-track-delay:25ms]',
    '[--media-caption-track-duration:var(--media-controls-transition-duration)]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:-5rem]',
    '@2xl/media-root:has-[[data-controls][data-visible]]:[&>*]:[--media-caption-track-y:-3rem]',
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
    '[&:fullscreen]:[--media-border-radius:0]',
    {
      '[&:fullscreen_video]:object-contain': !isShadowDOM,
      '[&:fullscreen_::slotted(video)]:object-contain': isShadowDOM,
    }
  );

/* ==========================================================================
   Controls (hide/show behavior)
   ========================================================================== */

export const controls = cn(
  baseControls,
  // Position & wrapping layout (small)
  'absolute bottom-1 inset-x-1',
  'p-1 gap-x-2 flex-wrap rounded-xl',
  'text-white z-10',
  'peer-data-open/error:hidden',
  'ease-(--media-controls-transition-timing-function)',
  'duration-(--media-controls-transition-duration)',
  '[@media(pointer:fine)]:will-change-[translate,filter,opacity]',
  '[@media(pointer:fine)]:transition-[translate,filter,opacity]',
  '[@media(pointer:coarse)]:will-change-[translate,opacity]',
  '[@media(pointer:coarse)]:transition-[translate,opacity]',
  // Hidden state
  'not-data-visible:opacity-0 not-data-visible:pointer-events-none',
  'motion-safe:not-data-visible:translate-y-full',
  '[@media(pointer:fine)]:motion-safe:not-data-visible:blur-sm',
  // Single-row layout (large)
  '@2xl/media-root:flex-nowrap @2xl/media-root:bottom-2 @2xl/media-root:inset-x-2'
);

/* ==========================================================================
   Button groups
   ========================================================================== */

export const buttonGroupStart = cn(baseButtonGroup, 'flex-1 @2xl/media-root:flex-none');
export const buttonGroupEnd = cn(baseButtonGroup, 'flex-1 justify-end @2xl/media-root:flex-none');

/* ==========================================================================
   Time
   ========================================================================== */

export const time = {
  ...baseTime,
  controls: cn(
    baseTime.controls,
    'grow-0 shrink-0 basis-full order-[-1] px-2.5',
    '@2xl/media-root:grow @2xl/media-root:shrink @2xl/media-root:basis-0 @2xl/media-root:order-[unset]'
  ),
};

/* ==========================================================================
   Error
   ========================================================================== */

export const error = {
  ...baseError,
  root: cn(baseError.root, 'pointer-events-none outline-none'),
  dialog: cn(baseError.dialog, 'pointer-events-auto'),
  title: cn(baseError.title, 'text-lg'),
};

/* ==========================================================================
   Preview
   ========================================================================== */

export const preview = {
  ...basePreview,
  root: cn(
    '[--media-preview-max-width:11rem] [--media-preview-padding:-0.5rem] [--media-preview-inset:calc(100cqi-100%)]',
    'absolute [left:clamp(calc(var(--media-preview-max-width)/2+var(--media-preview-padding)),var(--media-slider-pointer),calc(100%-var(--media-preview-max-width)/2-var(--media-preview-padding)+var(--media-preview-inset)))] bottom-full -translate-x-1/2',
    '@2xl/media-root:bottom-[calc(100%+0.25rem)] @2xl/media-root:[left:var(--media-slider-pointer)]',
    'opacity-0 scale-80 blur-sm origin-bottom',
    'transition-[scale,opacity,filter] duration-150',
    'group-data-pointing/slider:opacity-100 group-data-pointing/slider:scale-100 group-data-pointing/slider:blur-none',
    '[&:has([role=img][data-hidden])]:opacity-0 [&:has([role=img][data-hidden])]:scale-80 [&:has([role=img][data-hidden])]:blur-sm',
    '[&:has([role=img][data-loading])]:max-h-24',
    basePreview.root
  ),
  thumbnailWrapper: cn(
    basePreview.thumbnailWrapper,
    'after:absolute after:inset-0 after:rounded-[inherit]',
    'after:ring-1 after:ring-black/5 after:shadow-sm after:shadow-black/20'
  ),
  thumbnail: cn(basePreview.thumbnail, 'max-w-(--media-preview-max-width)'),
};

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'ring-1 ring-black/5'),
};

/* ==========================================================================
   Popup
   ========================================================================== */

export const popup = {
  ...basePopup,
  volume: cn(
    basePopup.popover,
    'py-3 px-0 bg-transparent rounded-xl',
    '[@media(prefers-reduced-transparency:reduce)]:bg-(--media-controls-background-color)',
    'contrast-more:bg-(--media-controls-background-color)'
  ),
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
export { overlay } from './components/overlay';
export { playbackRate } from './components/playback-rate';
export { poster } from './components/poster';
export { seek } from './components/seek';
