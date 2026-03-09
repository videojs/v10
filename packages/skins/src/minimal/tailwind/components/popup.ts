import { cn } from '@videojs/utils/style';

export const popup = {
  base: cn(
    // Reset default popover styles
    'm-0 border-0 text-inherit',
    // Animation
    'transition-[transform,scale,opacity,filter] duration-200',
    'data-starting-style:opacity-0 data-starting-style:scale-0 data-starting-style:blur-sm',
    'data-ending-style:opacity-0 data-ending-style:scale-0 data-ending-style:blur-sm',
    'data-instant:duration-0',
    // Ensure we animate from the correct origin based on the side the popover is on
    'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left'
  ),
};
