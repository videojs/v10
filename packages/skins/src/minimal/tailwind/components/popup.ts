import { cn } from '@videojs/utils/style';

const base = cn(
  // Reset default popover styles
  'm-0 border-0 text-inherit overflow-visible',
  // Animation
  'transition-[transform,scale,opacity,filter] duration-150',
  'data-starting-style:opacity-0 data-starting-style:scale-50 data-starting-style:blur-sm',
  'data-ending-style:opacity-0 data-ending-style:scale-50 data-ending-style:blur-sm',
  'data-instant:duration-0',
  // Ensure we animate from the correct origin based on the side the popover is on
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  // Safe area between trigger and popup
  'before:absolute before:pointer-events-[inherit]',
  'data-[side=top]:before:left-0 data-[side=top]:before:right-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:left-0 data-[side=bottom]:before:right-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:top-0 data-[side=left]:before:bottom-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:right-full'
);

export const popup = {
  base,
  popover: cn(
    base,
    'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
    'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)'
  ),
  tooltip: cn(
    base,
    'px-2 py-1 rounded-sm shadow-md shadow-black/10 bg-white/10 backdrop-blur-lg backdrop-saturate-150 text-[0.75rem] whitespace-nowrap',
    '[--media-tooltip-side-offset:0.75rem]',
    'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
    'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
    '[@media(prefers-reduced-transparency:reduce)]:bg-black/70',
    'contrast-more:bg-black/90'
  ),
};
