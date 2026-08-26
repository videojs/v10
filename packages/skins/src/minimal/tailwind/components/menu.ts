import { cn } from '@videojs/utils/style';

import { popup } from './popup';

const submenuPanel = cn(
  '[--media-menu-content-enter-translate:100%] [&:dir(rtl)]:[--media-menu-content-enter-translate:-100%]',
  'absolute inset-x-0 top-0 [max-height:inherit] overflow-auto overscroll-none p-(--media-menu-padding) outline-none',
  'z-10',
  'translate-none transition-[translate,filter] duration-(--media-menu-transition-duration) ease-out',
  'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
  'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
  'data-starting-style:[translate:var(--media-menu-content-enter-translate)_0] data-ending-style:[translate:var(--media-menu-content-enter-translate)_0]',
  'data-starting-style:blur data-ending-style:blur'
);

const itemBase = cn(
  'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-(--media-menu-item-border-radius) py-1.5 px-2',
  'text-start whitespace-nowrap',
  'text-shadow-2xs text-shadow-(color:--media-shadow-current-color)',
  'outline-2 -outline-offset-2 outline-transparent',
  'transition-colors duration-100 ease-in-out',
  'supports-[top:anchor(top)]:duration-50',
  'supports-[top:anchor(top)]:hover:duration-200',
  'supports-[top:anchor(top)]:data-highlighted:duration-200',
  'hover:bg-(--media-accent-background-color) hover:text-(--media-internal-accent-text-color)',
  'data-highlighted:bg-(--media-accent-background-color) data-highlighted:text-(--media-internal-accent-text-color)',
  'focus-visible:outline-(--media-focus-ring-color) focus-visible:outline-offset-2'
);

const menuTokens = cn(
  '[--media-menu-transition-duration:250ms]',
  '[--media-menu-max-height:--spacing(56)]',
  '[--media-menu-padding:--spacing(1)]',
  '[--media-menu-border-radius:--spacing(2.5)]',
  '[--media-menu-item-border-radius:calc(var(--media-menu-border-radius)_-_var(--media-menu-padding))]',
  'motion-reduce:[--media-menu-transition-duration:0ms]'
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
  'supports-[top:anchor(top)]:before:bg-(--media-accent-background-color)',
  'supports-[top:anchor(top)]:before:rounded-(--media-menu-item-border-radius)',
  'supports-[top:anchor(top)]:before:transition-[inset]',
  'supports-[top:anchor(top)]:before:duration-100',
  'supports-[top:anchor(top)]:before:ease-in-out',
  'supports-[top:anchor(top)]:has-data-[highlighted=]:before:duration-0'
);

const menuHostShell = cn(
  popup.popover,
  menuTokens,
  'min-w-max max-w-(--media-menu-available-width,none) max-h-[min(var(--media-menu-available-height,var(--media-menu-max-height)),var(--media-menu-max-height))]',
  'bg-(--media-popover-background-color) [backdrop-filter:var(--media-popover-backdrop-filter)]',
  'shadow-[0_0_0_1px_var(--media-popover-border-color),0_4px_6px_-1px_oklch(0_0_0/0.1),0_2px_4px_-2px_oklch(0_0_0/0.1)]',
  'box-border rounded-(--media-menu-border-radius) p-(--media-menu-padding) overscroll-none'
);

export const menu = {
  /** Standalone menu popover host (audio playback rate, sandbox demos). */
  root: cn(menuHostShell, 'overflow-auto!'),
  /** Root menu Content. */
  content: group,
  /** Settings menu host with nested submenu navigation. */
  settings: cn(
    menuHostShell,
    'group/menu-popup',
    // Only the menu size changes between panels.
    '[--media-popup-transition:var(--media-popup-base-transition),width_var(--media-popup-transition-timing-function)_var(--media-menu-transition-duration),height_var(--media-popup-transition-timing-function)_var(--media-menu-transition-duration)]',
    // Don't transition size on open/close.
    'data-starting-style:[--media-popup-transition:var(--media-popup-base-transition)]',
    'data-ending-style:[--media-popup-transition:var(--media-popup-base-transition)]',
    'min-w-44! w-(--media-menu-width) h-(--media-menu-height)',
    'overflow-hidden!'
  ),
  /** Root settings Content that exits when a nested Content opens. */
  settingsContent: cn(
    group,
    'translate-0 transition-[translate,filter] duration-(--media-menu-transition-duration) ease-out',
    '[--media-menu-content-exit-translate:-100%] [&:dir(rtl)]:[--media-menu-content-exit-translate:100%]',
    'data-[child-open]:[translate:var(--media-menu-content-exit-translate)_0]',
    'data-[child-open]:blur',
    // Avoid restarting the parent Content transition in WebKit while the
    // anchor-positioned highlight is active.
    'data-[child-open]:before:hidden',
    'group-has-[>_[data-submenu][data-ending-style]]/menu-popup:before:hidden'
  ),
  group,
  item: cn(
    itemBase,
    'justify-between tabular-nums text-inherit',
    'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
    'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  separator: 'my-1 border-b border-[oklch(1_0_0/0.1)]',
  tier: 'ps-0.5 pt-px text-(length:--media-font-size-tiny) font-semibold leading-none text-current/70',
  indicator: 'ms-auto -me-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
  icon: 'shrink-0 text-current/50 drop-shadow-[0_1px_0_var(--media-shadow-current-color)] group-hover/menu-item:text-inherit group-data-highlighted/menu-item:text-inherit',
  /** Nested submenu panel. */
  submenuPanel,
  back: cn(itemBase, 'mb-0.5 w-full'),
  hint: 'ms-auto inline-flex min-w-0 items-center gap-1 ps-2 text-current/65',
  hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
  chevron: 'size-3.5 [&:dir(rtl)]:[scale:-1_1]',
  backChevron: '[&:dir(rtl)]:[scale:1_1]',
  settingsGroup: 'group/settings',
  settingsTrigger: 'group',
  settingsIcon: 'transition-transform duration-150 ease-in-out group-aria-expanded:rotate-90 motion-reduce:duration-0',
};
