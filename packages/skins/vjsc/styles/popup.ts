export const popup = [
  'm-0 overflow-visible border-0 text-inherit',
  'data-starting-style:opacity-0 data-starting-style:scale-95',
  'data-[side=top]:data-starting-style:translate-y-(--popup-translate-distance)',
  'data-[side=bottom]:data-starting-style:-translate-y-(--popup-translate-distance)',
  'data-[side=left]:data-starting-style:translate-x-(--popup-translate-distance)',
  'data-[side=right]:data-starting-style:-translate-x-(--popup-translate-distance)',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:scale-95 data-ending-style:transform-none',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
] as const;

export const popupTransition = [
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
] as const;

export const popupVariants = {
  default: ['[--popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]', 'data-starting-style:blur-xs'],
  minimal: ['[--popup-translate-distance:--spacing(2)]'],
} as const;

export const popoverBridge = [
  'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
  'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
] as const;

export const tooltipBridge = [
  'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
  'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
] as const;
