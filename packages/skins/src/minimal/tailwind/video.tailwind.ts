import { cn } from '@videojs/utils/style';
import { controls as baseControls } from './components/controls';
import { popup as basePopup } from './components/popup';
import { preview as basePreview } from './components/preview';
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
      '[&_::slotted(video)]:block [&_::slotted(video)]:w-full [&_::slotted(video)]:h-full [&_::slotted(video)]:rounded-(--media-video-border-radius) [&_::slotted(video)]:[object-fit:var(--media-object-fit,cover)] [&_::slotted(video)]:[object-position:var(--media-object-position,center)]':
        isShadowDOM,
      '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]':
        !isShadowDOM,
    },
    '[--media-video-border-radius:var(--media-border-radius,0.75rem)]',
    // Poster image
    '[&>img]:absolute [&>img]:inset-0 [&>img]:w-full [&>img]:h-full [&>img]:rounded-[inherit]',
    '[&>img]:[object-fit:var(--media-object-fit,contain)] [&>img]:[object-position:var(--media-object-position,center)] [&>img]:pointer-events-none',
    '[&>img]:transition-opacity [&>img]:duration-250',
    '[&>img:not([data-visible])]:opacity-0',
    // Caption track CSS variables (consumed by the native caption bridge in light DOM)
    '[--media-caption-track-y:-0.5rem]',
    '[--media-caption-track-delay:600ms]',
    '[--media-caption-track-duration:150ms]',
    'motion-reduce:[--media-caption-track-duration:50ms]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-delay:25ms]',
    'has-[[data-controls][data-visible]]:[--media-caption-track-y:-3.5rem]',
    // Native caption track container
    !isShadowDOM
      ? [
          '[&_video::-webkit-media-text-track-container]:transition-transform',
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
  // Position
  'absolute bottom-0 inset-x-0',
  'pt-8 px-1.5 pb-1.5 gap-2',
  '[color:var(--media-color-primary,oklch(1_0_0))] z-10',
  // Transitions (fine pointer only — instant toggle on touch to avoid dead-zone taps)
  'will-change-[translate,filter,opacity]',
  '[@media(pointer:fine)]:transition-[translate,filter,opacity]',
  'ease-out',
  '[@media(pointer:fine)]:delay-0 [@media(pointer:fine)]:duration-75',
  // Hidden state
  'not-data-visible:opacity-0 not-data-visible:pointer-events-none',
  'not-data-visible:translate-y-full not-data-visible:blur-sm',
  '[@media(pointer:fine)]:not-data-visible:delay-500',
  '[@media(pointer:fine)]:not-data-visible:duration-500',
  // Reduced motion + hidden
  '[@media(pointer:fine)]:motion-reduce:not-data-visible:duration-100',
  'motion-reduce:not-data-visible:translate-y-0',
  'motion-reduce:not-data-visible:blur-none',
  'motion-reduce:not-data-visible:scale-100',
  // Wider container
  '@sm/media-root:pt-10 @sm/media-root:px-3 @sm/media-root:pb-3',
  '@sm/media-root:gap-3.5'
);

/* ==========================================================================
   Preview
   ========================================================================== */

export const preview = {
  ...basePreview,
  root: cn(
    'absolute left-(--media-slider-pointer) bottom-[calc(100%+0.5rem)] -translate-x-1/2',
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
  thumbnail: cn(basePreview.thumbnail, 'max-w-44'),
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
  volume: cn(basePopup.popover, '[--media-popover-side-offset:0.5rem] p-1 bg-transparent'),
};

/* ==========================================================================
   Shared components (no overrides)
   ========================================================================== */

export { iconState } from '../../shared/tailwind/icon-state';
export { tooltipState } from '../../shared/tailwind/tooltip-state';
export { bufferingIndicator } from './components/buffering';
export { button } from './components/button';
export { buttonGroup } from './components/button-group';
export { error } from './components/error';
export { icon, iconContainer, iconFlipped, iconHidden } from './components/icon';
export { overlay } from './components/overlay';
export { seek } from './components/seek';
export { time } from './components/time';
