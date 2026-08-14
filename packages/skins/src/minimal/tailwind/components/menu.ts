import { cn } from '@videojs/utils/style';

import { popup } from './popup';

const submenuPanel = cn(
  'absolute inset-x-0 top-0 [max-height:inherit] overflow-auto overscroll-none p-(--menu-padding) outline-none',
  'z-10',
  'translate-none transition-[translate,filter] duration-(--menu-transition-duration) ease-out will-change-[translate,filter]',
  'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
  'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
  'data-starting-style:translate-x-full data-ending-style:translate-x-full',
  'data-starting-style:blur data-ending-style:blur'
);

const itemBase = cn(
  'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-(--menu-item-border-radius) py-1.5 px-2',
  'text-left',
  'text-shadow-2xs text-shadow-(color:--shadow-current-color)',
  'outline-2 -outline-offset-2 outline-transparent',
  'transition-colors duration-100 ease-in-out',
  'supports-[top:anchor(top)]:duration-50',
  'supports-[top:anchor(top)]:hover:duration-200',
  'supports-[top:anchor(top)]:data-highlighted:duration-200',
  'hover:bg-(--accent-background-color) hover:text-(--accent-text-color)',
  'data-highlighted:bg-(--accent-background-color) data-highlighted:text-(--accent-text-color)',
  'focus-visible:outline-(--focus-ring-color) focus-visible:outline-offset-2'
);

const menuTokens = cn(
  '[--menu-transition-duration:250ms]',
  '[--menu-max-height:--spacing(56)]',
  '[--menu-padding:--spacing(1)]',
  '[--menu-border-radius:--spacing(2.5)]',
  '[--menu-item-border-radius:calc(var(--menu-border-radius)_-_var(--menu-padding))]',
  'motion-reduce:[--menu-transition-duration:0ms]'
);

const group = cn(
  'flex flex-col gap-0.5',
  '[anchor-scope:--menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:absolute',
  'supports-[top:anchor(top)]:before:[position-anchor:--menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:[inset:anchor(inside)]',
  // Firefox treats the moving highlight as a content shift and re-scrolls the
  // menu while hovering. Exclude it from scroll anchoring.
  'supports-[top:anchor(top)]:before:[overflow-anchor:none]',
  'supports-[top:anchor(top)]:before:pointer-events-none',
  'supports-[top:anchor(top)]:before:bg-(--accent-background-color)',
  'supports-[top:anchor(top)]:before:rounded-(--menu-item-border-radius)',
  'supports-[top:anchor(top)]:before:transition-[inset]',
  'supports-[top:anchor(top)]:before:duration-100',
  'supports-[top:anchor(top)]:before:ease-in-out'
);

const menuHostShell = cn(
  popup.popover,
  menuTokens,
  'min-w-max max-w-(--media-popover-available-width,none) max-h-[min(var(--media-popover-available-height,var(--menu-max-height)),var(--menu-max-height))]',
  'bg-(--popover-background-color) [backdrop-filter:var(--popover-backdrop-filter)]',
  'shadow-[0_0_0_1px_var(--popover-border-color),0_4px_6px_-1px_oklch(0_0_0/0.1),0_2px_4px_-2px_oklch(0_0_0/0.1)]',
  'box-border rounded-(--menu-border-radius) p-(--menu-padding) overscroll-none'
);

export const menu = {
  /** Standalone menu popover host (audio playback rate, sandbox demos). */
  root: cn(menuHostShell, 'overflow-auto!'),
  /** Settings menu host with nested submenu navigation. */
  settings: cn(
    menuHostShell,
    // Only the menu size changes between panels.
    '[--popup-transition:var(--popup-base-transition),width_var(--popup-transition-timing-function)_var(--menu-transition-duration),height_var(--popup-transition-timing-function)_var(--menu-transition-duration)]',
    // Don't transition size on open/close.
    'data-starting-style:[--popup-transition:var(--popup-base-transition)]',
    'data-ending-style:[--popup-transition:var(--popup-base-transition)]',
    'min-w-48! w-(--media-menu-width) h-(--media-menu-height)',
    '[&>:not([data-submenu])]:translate-none [&>:not([data-submenu])]:transition-[translate,filter]',
    '[&>:not([data-submenu])]:duration-(--menu-transition-duration) [&>:not([data-submenu])]:ease-out',
    '[&>:not([data-submenu])]:will-change-[translate,filter]',
    '[&[data-submenu-expanded=true]>:not([data-submenu])]:-translate-x-full',
    '[&[data-submenu-expanded=true]>:not([data-submenu])]:blur',
    // Avoid restarting the covered-content transition in WebKit while the
    // anchor-positioned highlight is active.
    '[&[data-submenu-expanded]>:not([data-submenu])]:before:hidden',
    'overflow-hidden!'
  ),
  group,
  item: cn(
    itemBase,
    'justify-between tabular-nums text-inherit',
    'supports-[top:anchor(top)]:hover:[anchor-name:--menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:hover:bg-transparent',
    'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
    'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  separator: 'my-1 border-b border-[oklch(1_0_0/0.1)]',
  tier: 'pl-0.5 pt-px text-(length:--font-size-tiny) font-semibold leading-none text-current/70',
  indicator: 'ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
  icon: 'shrink-0 text-current/50 drop-shadow-[0_1px_0_var(--shadow-current-color)] group-hover/menu-item:text-inherit group-data-highlighted/menu-item:text-inherit',
  /** Nested submenu panel. */
  submenuPanel,
  back: cn(itemBase, 'mb-0.5 w-full'),
  hint: 'ml-auto inline-flex min-w-0 items-center gap-1 pl-2 text-current/65',
  hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
  chevron: 'size-3.5',
  settingsGroup: 'group/settings',
  settingsTrigger: 'group',
  settingsIcon: 'transition-transform duration-150 ease-in-out group-aria-expanded:rotate-90 motion-reduce:duration-0',
};
