import { cn } from '@videojs/utils/style';
import { controls as baseControls } from './components/controls';
import { popup as basePopup } from './components/popup';
import { root as baseRoot } from './components/root';
import { slider as baseSlider } from './components/slider';

/* ==========================================================================
   Root
   ========================================================================== */

export const root = (isShadowDOM: boolean) =>
  cn(
    baseRoot,
    'bg-black',
    // Border ring (::after)
    'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
    'after:inset-0 after:ring-1 after:ring-inset after:ring-black/15',
    'dark:after:ring-white/15',
    // Video element
    {
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-border-radius,0.75rem)':
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
   Controls (hide/show behavior)
   ========================================================================== */

export const controls = cn(
  baseControls,
  // Position
  'absolute bottom-0 inset-x-0',
  'pt-8 px-1.5 pb-1.5 gap-2',
  'text-white z-10',
  // Transitions
  'will-change-[translate,filter,opacity]',
  'transition-[translate,filter,opacity] ease-out',
  'delay-0 duration-75',
  // Hidden state
  'not-data-visible:opacity-0 not-data-visible:translate-y-full',
  'not-data-visible:blur-sm not-data-visible:pointer-events-none',
  'not-data-visible:delay-500 not-data-visible:duration-500',
  // Reduced motion + hidden
  'motion-reduce:not-data-visible:duration-100',
  'motion-reduce:not-data-visible:translate-y-0',
  'motion-reduce:not-data-visible:blur-none motion-reduce:not-data-visible:scale-100',
  // Wider container
  '@sm/media-root:pt-10 @sm/media-root:px-3 @sm/media-root:pb-3',
  '@sm/media-root:gap-3.5'
);

/* ==========================================================================
   Sliders
   ========================================================================== */

export const slider = {
  ...baseSlider,
  track: cn(baseSlider.track, 'shadow-[0_0_0_1px_oklch(0_0_0/0.05)]'),
};

/* ==========================================================================
   Popup
   ========================================================================== */

export const popup = {
  ...basePopup,
  volume: cn('[--media-popover-side-offset:0.5rem] p-1 bg-transparent'),
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { error } from './components/error';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { iconState } from './components/icon-state';
export { overlay } from './components/overlay';
export { seek } from './components/seek';
export { time } from './components/time';
export { tooltipState } from './components/tooltip-state';
