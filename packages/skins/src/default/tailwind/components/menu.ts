import { cn } from '@videojs/utils/style';

import { popup } from './popup';
import { surface } from './surface';

const panelBase = cn(
  'absolute inset-0 overflow-auto overscroll-none p-(--menu-padding) outline-none translate-none',
  'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
  'transition-[translate,filter] duration-(--menu-transition-duration) ease-in-out will-change-[translate,filter]'
);

const rootView = cn(
  panelBase,
  'group/menu-root-view',
  'data-[menu-view-state=inactive]:-translate-x-full data-[menu-view-state=inactive]:blur'
);

const submenuPanel = cn(
  panelBase,
  'z-10',
  'not-data-open:not-data-ending-style:-translate-x-full',
  'not-data-open:not-data-ending-style:transition-none',
  'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
  'data-starting-style:blur data-ending-style:blur',
  'data-starting-style:data-[direction=forward]:translate-x-full',
  'data-ending-style:data-[direction=forward]:-translate-x-full',
  'data-starting-style:data-[direction=back]:-translate-x-full',
  'data-ending-style:data-[direction=back]:translate-x-full'
);

const itemBase = cn(
  'flex cursor-pointer select-none items-center gap-1.5 rounded-(--menu-item-border-radius) py-1.5 px-2',
  'text-left',
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)',
  'outline-2 -outline-offset-2 outline-transparent',
  'transition-colors duration-100 ease-out',
  'hover:bg-current/10 data-highlighted:bg-current/10',
  'supports-[top:anchor(top)]:hover:[anchor-name:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:hover:bg-transparent',
  'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
  'focus-visible:outline-current focus-visible:outline-offset-2'
);

const menuTokens = cn(
  '[--menu-transition-duration:250ms] [--menu-max-height:14rem] [--menu-padding:0.25rem]',
  '[--menu-border-radius:0.75rem] [--menu-item-border-radius:calc(var(--menu-border-radius)_-_var(--menu-padding))]',
  'motion-reduce:[--menu-transition-duration:0ms]'
);

const group = cn(
  'flex flex-col gap-0.5',
  'supports-[top:anchor(top)]:before:absolute',
  'supports-[top:anchor(top)]:before:[position-anchor:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:[inset:anchor(inside)]',
  'supports-[top:anchor(top)]:before:pointer-events-none',
  'supports-[top:anchor(top)]:before:bg-current/10',
  'supports-[top:anchor(top)]:before:rounded-(--menu-item-border-radius)',
  'supports-[top:anchor(top)]:before:transition-[inset]',
  'supports-[top:anchor(top)]:before:duration-100',
  'supports-[top:anchor(top)]:before:ease-in-out',
  'group-data-[menu-view-state=inactive]/menu-root-view:before:hidden'
);

const menuHostShell = cn(
  popup.popover,
  surface,
  menuTokens,
  'max-w-(--media-popover-available-width,none) max-h-[min(var(--media-popover-available-height,var(--menu-max-height)),var(--menu-max-height))]',
  'box-border rounded-(--menu-border-radius) p-(--menu-padding) overscroll-none'
);

export const menu = {
  /** Standalone menu popover host (audio playback rate, sandbox demos). */
  root: cn(menuHostShell, 'overflow-auto!'),
  /** Settings menu viewport host with nested submenu navigation. */
  settings: cn(
    menuHostShell,
    // Add height and width transitions.
    '[--media-popup-transition:var(--media-popup-base-transition),height_var(--media-popup-transition-timing-function)_var(--menu-transition-duration),width_var(--media-popup-transition-timing-function)_var(--menu-transition-duration)]',
    // Don't transition width and height on open/close.
    'data-starting-style:[--media-popup-transition:var(--media-popup-base-transition)] data-ending-style:[--media-popup-transition:var(--media-popup-base-transition)]',
    'min-w-48 w-(--media-menu-width) h-(--media-menu-height)',
    '!overflow-hidden'
  ),
  group,
  item: cn(
    itemBase,
    'group/menu-item justify-between tabular-nums text-inherit',
    'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  separator: 'my-1 border-b border-[oklch(0_0_0/0.1)] shadow-[0_1px_0_0_oklch(1_0_0/0.075)]',
  tier: 'pl-0.5 pt-px text-[0.5625rem] font-semibold leading-none text-current/70',
  indicator: 'ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
  icon: 'shrink-0 text-current/65 drop-shadow-[0_1px_0_var(--media-current-shadow-color)]',
  /** Root settings view — slides out when a submenu is active. */
  rootView,
  /** Submenu panel — slides in/out alongside the root view. */
  submenuPanel,
  back: cn(itemBase, 'mb-0.5 w-full'),
  hint: 'ml-auto inline-flex min-w-0 items-center gap-1 pl-2 text-xs text-current/65',
  hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
  chevron: 'size-3.5',
  settingsGroup: 'group/settings',
  settingsTrigger: 'group hidden group-has-[[data-availability=available]]/settings:grid',
  settingsIcon: 'transition-transform duration-150 ease-in-out group-aria-expanded:rotate-90 motion-reduce:duration-0',
};
