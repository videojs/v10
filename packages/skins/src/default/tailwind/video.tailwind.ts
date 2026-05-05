import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { buttonGroup as baseButtonGroup } from './components/button-group';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { inputFeedback as baseInputFeedback } from './components/input-feedback';
import { popup as basePopup } from './components/popup';
import { preview as basePreview } from './components/preview';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';
import { surface } from './components/surface';
import { time as baseTime } from './components/time';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = (isShadowDOM: boolean) =>
  cn(
    baseRoot,
    'bg-black',
    // Inner border ring
    'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
    'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/15',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-video-border-radius) [&_::slotted(video)]:[object-fit:var(--media-object-fit,contain)] [&_::slotted(video)]:[object-position:var(--media-object-position,center)]':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]':
        !isShadowDOM,
    },
    '[--media-spring-timing-function:linear(0,0.034_1.5%,0.763_9.7%,1.066_13.9%,1.198_19.9%,1.184_21.8%,0.963_37.5%,0.997_50.9%,1)]',
    '[--media-video-border-radius:var(--media-border-radius,2rem)]',
    '[--media-controls-transition-duration:100ms]',
    '[--media-controls-transition-timing-function:ease-out]',
    '[--media-error-dialog-transition-duration:350ms]',
    '[--media-error-dialog-transition-delay:100ms]',
    '[--media-error-dialog-transition-timing-function:var(--media-spring-timing-function)]',
    '[--media-popup-transition-duration:100ms]',
    '[--media-popup-transition-timing-function:ease-out]',
    '[--media-surface-background-color:oklch(1_0_0/0.1)]',
    '[--media-surface-inner-border-color:oklch(1_0_0/0.05)]',
    '[--media-surface-outer-border-color:oklch(0_0_0/0.1)]',
    '[--media-surface-shadow-color:oklch(0_0_0/0.15)]',
    '[--media-surface-backdrop-filter:blur(16px)_saturate(1.5)]',
    'motion-reduce:[--media-error-dialog-transition-duration:50ms]',
    'motion-reduce:[--media-error-dialog-transition-delay:0ms]',
    'motion-reduce:[--media-error-dialog-transition-timing-function:ease-out]',
    '[--media-tooltip-side-offset:0.75rem]',
    '[--media-popover-side-offset:0.5rem]',
    'motion-reduce:[--media-popup-transition-duration:0ms]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)]',
    'contrast-more:[--media-surface-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-inner-border-color:oklch(1_0_0/0.25)]',
    'contrast-more:[--media-surface-inner-border-color:oklch(1_0_0/0.25)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-outer-border-color:transparent]',
    'contrast-more:[--media-surface-outer-border-color:transparent]',
    'pointer-fine:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:300ms]',
    'pointer-coarse:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:150ms]',
    'motion-reduce:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:50ms]',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:-0.5rem]',
    '[--media-caption-track-delay:25ms]',
    '[--media-caption-track-duration:var(--media-controls-transition-duration)]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:-5.5rem]',
    '@2xl/media-root:has-[[data-controls][data-visible]]:*:[--media-caption-track-y:-3.5rem]',
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
  surface,
  // Position & wrapping layout (small)
  'absolute bottom-2 inset-x-2 flex-wrap',
  '[color:var(--media-color-primary,oklch(1_0_0))] z-10',
  'peer-data-open/error:hidden',
  'ease-(--media-controls-transition-timing-function) origin-bottom',
  'duration-(--media-controls-transition-duration)',
  'pointer-fine:will-change-[scale,filter,opacity]',
  'pointer-fine:transition-[scale,filter,opacity]',
  'pointer-coarse:will-change-[scale,opacity]',
  'pointer-coarse:transition-[scale,opacity]',
  // Hidden state
  'not-data-visible:pointer-events-none not-data-visible:opacity-0',
  'motion-safe:not-data-visible:scale-90',
  'pointer-fine:motion-safe:not-data-visible:blur-sm',
  // Single-row layout (large)
  '@2xl/media-root:bottom-3 @2xl/media-root:inset-x-3 @2xl/media-root:flex-nowrap @2xl/media-root:gap-x-0.5 @2xl/media-root:p-1'
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
  group: cn(
    baseTime.group,
    'grow-0 shrink-0 basis-full order-[-1] px-2.5',
    '@2xl/media-root:grow @2xl/media-root:shrink @2xl/media-root:basis-0 @2xl/media-root:order-[unset]'
  ),
};

/* ==========================================================================
   Preview (with video surface)
   ========================================================================== */

export const preview = {
  ...basePreview,
  root: cn(
    '[--media-preview-max-width:11rem] [--media-preview-padding:-1.125rem] [--media-preview-inset:calc((100cqi-100%)/2)]',
    'absolute [left:clamp(calc(var(--media-preview-max-width)/2+var(--media-preview-padding)-var(--media-preview-inset)),var(--media-slider-pointer),calc(100%-var(--media-preview-max-width)/2-var(--media-preview-padding)+var(--media-preview-inset)))] bottom-[calc(100%+1.2rem)] -translate-x-1/2',
    'opacity-0 scale-80 blur-sm origin-bottom',
    'transition-[scale,opacity,filter] duration-150',
    'group-data-pointing/slider:opacity-100 group-data-pointing/slider:scale-100 group-data-pointing/slider:blur-none',
    'has-[[role=img][data-hidden]]:opacity-0 has-[[role=img][data-hidden]]:scale-80 has-[[role=img][data-hidden]]:blur-sm',
    'has-[[role=img][data-loading]]:max-h-24',
    surface,
    basePreview.root
  ),
  thumbnail: cn(basePreview.thumbnail, 'max-w-(--media-preview-max-width)'),
};

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'bg-white/20 ring-1 ring-black/5'),
};

/* ==========================================================================
   Popup (with video surface)
   ========================================================================== */

export const popup = {
  ...basePopup,
  popover: cn(surface, basePopup.popover),
  tooltip: cn(surface, basePopup.tooltip),
};

/* ==========================================================================
   Buffering (with video surface)
   ========================================================================== */

export const bufferingIndicator = {
  ...baseBufferingIndicator,
  container: cn(baseBufferingIndicator.container, surface),
};

/* ==========================================================================
   Error (with video surface)
   ========================================================================== */

export const error = {
  ...baseError,
  dialog: cn(baseError.dialog, surface, 'text-shadow-2xs text-shadow-black/25'),
  content: cn(baseError.content, 'text-shadow-inherit'),
  title: cn(baseError.title, 'text-base'),
};

/* ==========================================================================
   Input Feedback (islands use video surface)
   ========================================================================== */

export const inputFeedback = {
  ...baseInputFeedback,
  island: {
    ...baseInputFeedback.island,
    base: cn(baseInputFeedback.island.base, surface),
  },
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { overlay } from './components/overlay';
export { playbackRate } from './components/playback-rate';
export { poster } from './components/poster';
export { seek } from './components/seek';
