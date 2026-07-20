import { cn } from '@videojs/utils/style';

const base = cn(
  // Reset default popover styles
  '[--media-popup-base-transition:opacity_var(--media-popup-transition-timing-function)_var(--media-popup-transition-duration),filter_var(--media-popup-transition-timing-function)_var(--media-popup-transition-duration),transform_var(--media-popup-transition-timing-function)_var(--media-popup-transition-duration),scale_var(--media-popup-transition-timing-function)_var(--media-popup-transition-duration)]',
  '[--popup-translate-distance:0.5rem] m-0 border-0 text-inherit overflow-visible',
  // Animation
  '[transition:var(--media-popup-transition,var(--media-popup-base-transition))]',
  // We have to use transform here for translate as the translate property is used for positioning by core.
  'data-starting-style:opacity-0 data-starting-style:blur-xs data-starting-style:scale-95 data-starting-style:[transform:translate(var(--popup-translate-x-distance,0),var(--popup-translate-y-distance,0))]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:scale-95 data-ending-style:transform-none',
  // Speed up the exit transition.
  'data-ending-style:[transition-duration:max(0ms,calc(var(--media-popup-transition-duration)-50ms))]',
  // Ensure we animate from the correct origin based on the side the popover is on
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:[--popup-translate-y-distance:var(--popup-translate-distance)] data-[side=bottom]:[--popup-translate-y-distance:calc(var(--popup-translate-distance)*-1)]',
  'data-[side=left]:[--popup-translate-x-distance:var(--popup-translate-distance)] data-[side=right]:[--popup-translate-x-distance:calc(var(--popup-translate-distance)*-1)]',
  // Safe area between trigger and popup
  'before:absolute before:pointer-events-[inherit]',
  'data-[side=top]:before:left-0 data-[side=top]:before:right-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:left-0 data-[side=bottom]:before:right-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:top-0 data-[side=left]:before:bottom-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:right-full'
);

export const popup = {
  popover: cn(
    base,
    'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
    'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)'
  ),
  tooltip: cn(
    base,
    'py-1 px-2.5 rounded-full text-[0.75rem] whitespace-nowrap',
    'data-open:flex data-open:items-center data-open:gap-1',
    'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
    'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)'
  ),
  volume: 'py-3 px-0 rounded-full',
  tooltipShortcut: cn(
    'min-w-[1.5em] p-[0.1em] bg-current/30 text-[90%] font-semibold font-[inherit] leading-[1.25] text-center rounded'
  ),
};
