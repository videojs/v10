import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
import { preview as basePreview } from './components/preview';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';
import { surface as baseSurface } from './components/surface';

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
    '[--media-video-border-radius:var(--media-border-radius,2rem)]',
    '[--media-controls-transition-duration:100ms]',
    '[--media-controls-transition-delay:0ms]',
    '[@media(pointer:fine)]:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-delay:500ms]',
    '[@media(pointer:fine)]:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:300ms]',
    '[@media(pointer:coarse)]:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:150ms]',
    'motion-reduce:has-[[data-controls]:not([data-visible])]:[--media-controls-transition-duration:100ms]',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:-0.5rem]',
    '[--media-caption-track-delay:calc(var(--media-controls-transition-delay)_+_25ms)]',
    '[--media-caption-track-duration:var(--media-controls-transition-duration)]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:-3.5rem]',
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
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

export const surface = cn(
  baseSurface,
  'bg-white/10',
  'backdrop-saturate-150 backdrop-blur-lg',
  // Border and shadow
  'ring-black/15 shadow-black/10',
  // Border to enhance contrast on lighter videos
  'after:ring-white/5',
  // Reduced transparency for users with preference
  '[@media(prefers-reduced-transparency:reduce)]:bg-black/70',
  // High contrast mode
  'contrast-more:bg-black/90'
);

/* ==========================================================================
   Controls (hide/show behavior)
   ========================================================================== */

export const controls = cn(
  baseControls,
  surface,
  // Position
  'absolute bottom-3 inset-x-3',
  '[color:var(--media-color-primary,oklch(1_0_0))] z-10',
  'peer-data-open/error:hidden',
  'ease-out origin-bottom',
  'duration-(--media-controls-transition-duration)',
  'delay-(--media-controls-transition-delay)',
  '[@media(pointer:fine)]:will-change-[scale,filter,opacity]',
  '[@media(pointer:fine)]:transition-[scale,filter,opacity]',
  '[@media(pointer:coarse)]:will-change-[scale,opacity]',
  '[@media(pointer:coarse)]:transition-[scale,opacity]',
  // Hidden state
  'not-data-visible:pointer-events-none not-data-visible:opacity-0',
  'motion-safe:not-data-visible:scale-90',
  '[@media(pointer:fine)]:motion-safe:not-data-visible:blur-sm'
);

/* ==========================================================================
   Preview (with video surface)
   ========================================================================== */

export const preview = {
  ...basePreview,
  root: cn(
    'absolute left-(--media-slider-pointer) bottom-[calc(100%+1.2rem)] -translate-x-1/2',
    'opacity-0 scale-80 blur-sm origin-bottom',
    'transition-[scale,opacity,filter] duration-150',
    'group-data-pointing/slider:opacity-100 group-data-pointing/slider:scale-100 group-data-pointing/slider:blur-none',
    '[&:has([role=img][data-hidden])]:opacity-0 [&:has([role=img][data-hidden])]:scale-80 [&:has([role=img][data-hidden])]:blur-sm',
    '[&:has([role=img][data-loading])]:max-h-24',
    surface,
    basePreview.root
  ),
  thumbnail: cn(basePreview.thumbnail, 'max-w-44'),
};

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'bg-white/20 shadow-[0_0_0_1px_oklch(0_0_0/0.05)]'),
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
  dialog: cn(baseError.dialog, surface, 'text-shadow-[0_1px_0_oklch(0_0_0/0.25)]'),
  content: cn(baseError.content, 'text-shadow-inherit'),
  title: cn(baseError.title, 'text-base'),
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { tooltipState } from '../../shared/tailwind/tooltip-state';
export { button } from './components/button';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { overlay } from './components/overlay';
export { playbackRate } from './components/playback-rate';
export { poster } from './components/poster';
export { seek } from './components/seek';
export { time } from './components/time';
