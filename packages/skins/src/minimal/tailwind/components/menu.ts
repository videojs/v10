import { cn } from '@videojs/utils/style';

import { popup } from './popup';

const panelBase = cn(
  'absolute inset-0 overflow-auto overscroll-none p-1 outline-none translate-none',
  'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
  'transition-[translate,filter] duration-(--menu-transition-duration) ease-in-out will-change-[translate]'
);

const rootView = cn(
  panelBase,
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
  'flex h-(--menu-item-height) cursor-pointer select-none items-center rounded-lg',
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)',
  'outline-2 -outline-offset-2 outline-transparent',
  'transition-[background-color,color] duration-(--menu-item-transition-duration) ease-out',
  'hover:bg-current/10 data-highlighted:bg-current/10',
  'focus-visible:outline-current focus-visible:outline-offset-2'
);

const menuTokens = cn(
  '[--menu-item-height:1.875rem] [--menu-transition-duration:200ms] [--menu-item-transition-duration:100ms]',
  'motion-reduce:[--menu-transition-duration:0ms] motion-reduce:[--menu-item-transition-duration:0ms]'
);

const menuHostShell = cn(
  popup.popover,
  menuTokens,
  'max-w-(--media-popover-available-width,none) max-h-(--media-popover-available-height,none)',
  'bg-(--media-popover-background-color) [backdrop-filter:var(--media-popover-backdrop-filter)]',
  'shadow-[0_0_0_1px_var(--media-popover-border-color),0_4px_6px_-1px_oklch(0_0_0/0.1),0_2px_4px_-2px_oklch(0_0_0/0.1)]',
  'transition-[transform,scale,opacity,filter,width,height] duration-(--menu-transition-duration) ease-in-out',
  'box-border rounded-xl p-1 overscroll-none'
);

export const menu = {
  /** Standalone menu popover host (audio playback rate, sandbox demos). */
  root: cn(menuHostShell, 'min-w-24 overflow-auto'),
  /** Settings menu viewport host with nested submenu navigation. */
  settings: cn(
    menuHostShell,
    '[--menu-transition-duration:250ms]',
    'relative min-w-44 w-(--media-menu-width) h-(--media-menu-height)',
    'overflow-hidden'
  ),
  group: 'flex flex-col gap-0.5',
  item: cn(
    itemBase,
    'group/menu-item justify-between gap-2 px-2.5 tabular-nums text-inherit',
    'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  indicator: '-mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
  /** Root settings view — slides out when a submenu is active. */
  rootView,
  /** Submenu panel — slides in/out alongside the root view. */
  submenuPanel,
  back: cn(
    itemBase,
    'mb-0.5 w-full gap-1.5 px-2.5 font-medium text-current/70',
    'hover:text-inherit data-highlighted:text-inherit focus-visible:text-inherit'
  ),
  hint: 'ml-auto flex min-w-0 items-center gap-1 text-xs text-current/65',
  hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
  chevron: 'size-3.5 first:-ml-1 last:-mr-1',
  settingsGroup: 'group/settings',
  settingsTrigger: 'group hidden group-has-[[data-availability=available]]/settings:grid',
  settingsIcon: 'transition-transform duration-150 ease-in-out group-aria-expanded:rotate-90 motion-reduce:duration-0',
};
