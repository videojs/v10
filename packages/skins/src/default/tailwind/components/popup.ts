import { cn } from '@videojs/utils/style';

export const popupReset = 'm-0 border-0 text-inherit';

export const popupSideOrigins = cn(
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left'
);

export const popupOpenCloseStyles = cn(
  'data-starting-style:opacity-0 data-starting-style:scale-50 data-starting-style:blur-sm',
  'data-ending-style:opacity-0 data-ending-style:scale-50 data-ending-style:blur-sm',
  'data-instant:duration-0'
);

export const popupSideOffsetBefore = cn(
  'before:absolute before:pointer-events-[inherit]',
  'data-[side=top]:before:left-0 data-[side=top]:before:right-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:left-0 data-[side=bottom]:before:right-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:top-0 data-[side=left]:before:bottom-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:right-full'
);

export const popoverSideOffsetSize = cn(
  'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
  'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)'
);

export const tooltipSideOffsetSize = cn(
  'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
  'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)'
);

/** Popover positioning shell shared by popups and menus (no overflow or transition timing). */
export const popoverShell = cn(popupReset, popupSideOffsetBefore, popupSideOrigins, popupOpenCloseStyles);

const popoverAnimation = cn(
  'transition-[transform,scale,opacity,filter]',
  'duration-(--media-popover-transition-duration)',
  'ease-(--media-popover-transition-timing-function)'
);

export const popup = {
  popover: cn(
    popoverShell,
    popoverSideOffsetSize,
    popoverAnimation,
    'overflow-visible',
    'data-transitioning:overflow-hidden'
  ),
  tooltip: cn(
    popoverShell,
    tooltipSideOffsetSize,
    popoverAnimation,
    'py-1 px-2.5 rounded-full text-[0.75rem] whitespace-nowrap',
    'overflow-visible',
    'data-transitioning:overflow-hidden'
  ),
  volume: 'py-3 px-0 rounded-full',
};
