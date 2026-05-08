import { cn } from '@videojs/utils/style';

export const menu = {
  root: cn(
    'box-border min-w-[min(6rem,var(--media-popover-available-width,6rem))]',
    'max-w-(--media-popover-available-width) max-h-(--media-popover-available-height)',
    'p-1.5 !overflow-auto overscroll-none rounded-[1.25rem]',
    'before:hidden'
  ),
  group: cn(
    'relative flex flex-col gap-0.5',
    'before:hidden supports-[top:anchor(top)]:before:block',
    'before:absolute before:pointer-events-none before:rounded-full before:bg-current/10',
    'before:transition-[inset] before:duration-100 before:ease-in-out',
    'before:[position-anchor:--media-menu-item-highlight-anchor] before:[inset:anchor(inside)]'
  ),
  item: cn(
    'group/menu-item flex min-h-8 cursor-pointer items-center justify-between gap-2 rounded-full px-3',
    'tabular-nums text-inherit outline-2 -outline-offset-2 outline-transparent',
    'hover:bg-current/10 data-highlighted:bg-current/10',
    'supports-[top:anchor(top)]:hover:bg-transparent supports-[top:anchor(top)]:data-highlighted:bg-transparent',
    'supports-[top:anchor(top)]:hover:[anchor-name:--media-menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  indicator: cn(
    '-mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
    '[&_.media-icon]:drop-shadow-[0_1px_0_var(--media-current-shadow-color)]'
  ),
};
