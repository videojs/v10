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
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left'
);

export const popup = {
  popover: cn(base, '[--media-popover-side-offset:0.5rem]'),
  tooltip: cn(
    base,
    'py-1 px-2.5 rounded-full text-[0.75rem] whitespace-nowrap',
    '[--media-tooltip-side-offset:0.75rem]'
  ),
  volume: 'py-2.5 px-1 rounded-full',
};
