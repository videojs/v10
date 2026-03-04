import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from './components/buffering';
import { controls as baseControls } from './components/controls';
import { error as baseError } from './components/error';
import { popup as basePopup } from './components/popup';
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
    'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/10',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-border-radius,2rem)':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit]': !isShadowDOM,
    },
    // Poster image
    '[&>img]:absolute [&>img]:inset-0 [&>img]:w-full [&>img]:h-full [&>img]:rounded-[inherit]',
    '[&>img]:object-cover [&>img]:pointer-events-none',
    '[&>img]:transition-opacity [&>img]:duration-250',
    '[&>img:not([data-visible])]:opacity-0',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-delay:600ms]',
    '[--media-caption-track-y:-0.5rem]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-delay:25ms]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:-3.5rem]',
    // Native caption track container
    !isShadowDOM
      ? [
          '[&_video::-webkit-media-text-track-container]:transition-transform',
          '[&_video::-webkit-media-text-track-container]:duration-150',
          '[&_video::-webkit-media-text-track-container]:ease-out',
          '[&_video::-webkit-media-text-track-container]:delay-(--media-caption-track-delay)',
          '[&_video::-webkit-media-text-track-container]:translate-y-(--media-caption-track-y)',
          '[&_video::-webkit-media-text-track-container]:scale-98',
          '[&_video::-webkit-media-text-track-container]:z-1',
          '[&_video::-webkit-media-text-track-container]:font-[inherit]',
          'motion-reduce:[&_video::-webkit-media-text-track-container]:duration-50',
        ]
      : [],
    // Fullscreen
    '[&:fullscreen]:rounded-none'
  );

/* ==========================================================================
   Surface (shared glass effect for tooltips, popovers, controls)
   ========================================================================== */

export const surface = cn(
  baseSurface,
  'bg-white/10',
  'backdrop-brightness-90 backdrop-saturate-150 backdrop-blur-3xl',
  // Border and shadow
  'ring-white/5 shadow-black/10',
  // Border to enhance contrast on lighter videos
  'after:ring-black/15',
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
  'text-white z-10',
  // Transitions
  'will-change-[scale,transform,filter,opacity]',
  'transition-[scale,transform,filter,opacity] ease-out',
  'delay-0 duration-100 origin-bottom',
  // Hidden state
  'not-data-visible:pointer-events-none not-data-visible:blur-sm',
  'not-data-visible:scale-90 not-data-visible:opacity-0',
  'not-data-visible:delay-500 not-data-visible:duration-300',
  // Reduced motion + hidden
  'motion-reduce:not-data-visible:duration-100',
  'motion-reduce:not-data-visible:blur-none',
  'motion-reduce:not-data-visible:scale-100'
);

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
  base: cn(basePopup.base, surface),
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
  dialog: cn(baseError.dialog, surface),
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { button } from './components/button';
export { captions } from './components/captions';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { iconState } from './components/icon-state';
export { overlay } from './components/overlay';
export { playbackRate } from './components/playback-rate';
export { seek } from './components/seek';
export { time } from './components/time';
