import { cn } from '@videojs/utils/style';

export const menu = {
  root: cn(
    'box-border min-w-[min(6rem,var(--media-popover-available-width,6rem))]',
    'max-w-(--media-popover-available-width) max-h-(--media-popover-available-height)',
    'bg-(--media-tooltip-background-color) p-1 !overflow-auto overscroll-none rounded-xl',
    '[backdrop-filter:var(--media-tooltip-backdrop-filter)]',
    'ring-1 ring-(color:--media-tooltip-border-color) shadow-md shadow-black/10',
    'before:hidden'
  ),
  group: 'flex flex-col gap-0.5',
  item: cn(
    'group/menu-item flex min-h-8 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5',
    'tabular-nums text-inherit outline-2 -outline-offset-2 outline-transparent',
    'hover:bg-current/10 data-highlighted:bg-current/10',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  indicator: '-mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
};
