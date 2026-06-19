import { cn } from '@videojs/utils/style';

import { popup } from './popup';
import { surface } from './surface';

const panelBase = cn(
  'absolute inset-0 overflow-auto overscroll-none p-1 outline-none translate-none',
  'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
  'transition-[translate,filter] duration-(--menu-transition-duration) ease-out will-change-[translate,filter]'
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
  'flex cursor-pointer select-none items-center gap-2 rounded-lg py-1.5 px-3',
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)',
  'outline-2 -outline-offset-2 outline-transparent',
  'transition-colors duration-100 ease-out',
  'hover:bg-current/10 data-highlighted:bg-current/10',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  '[&_.media-icon]:drop-shadow-[0_1px_0_var(--media-current-shadow-color)]'
);

const menuTokens = cn(
  '[--menu-transition-duration:250ms] [--menu-max-height:14rem]',
  '[--popup-transition-property:,_width,_height] [--popup-transition-duration:,_var(--menu-transition-duration),_var(--menu-transition-duration)]',
  'motion-reduce:[--menu-transition-duration:0ms]'
);

const menuHostShell = cn(
  popup.popover,
  surface,
  menuTokens,
  'max-w-(--media-popover-available-width,none) max-h-[min(var(--media-popover-available-height,var(--menu-max-height)),var(--menu-max-height))]',
  'box-border rounded-xl p-1 overscroll-none'
);

export const menu = {
  /** Standalone menu popover host (audio playback rate, sandbox demos). */
  root: cn(menuHostShell, 'min-w-24 !overflow-auto'),
  /** Settings menu viewport host with nested submenu navigation. */
  settings: cn(menuHostShell, 'min-w-44 w-(--media-menu-width) h-(--media-menu-height)', '!overflow-hidden'),
  group: 'flex flex-col gap-0.5',
  item: cn(
    itemBase,
    'group/menu-item justify-between tabular-nums text-inherit',
    'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
    'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
  ),
  separator: 'my-1 border-b border-[oklch(0_0_0/0.1)] shadow-[0_1px_0_0_oklch(1_0_0/0.075)]',
  tier: 'self-start -ml-1 pt-px text-[0.5625rem] font-semibold leading-none text-current/70',
  badge: 'ml-auto',
  indicator: cn(
    '-mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
    '[&_.media-icon]:drop-shadow-[0_1px_0_var(--media-current-shadow-color)]'
  ),
  /** Root settings view — slides out when a submenu is active. */
  rootView,
  /** Submenu panel — slides in/out alongside the root view. */
  submenuPanel,
  back: cn(itemBase, 'mb-0.5 w-full font-medium'),
  hint: 'ml-auto flex min-w-0 items-center gap-1 text-xs text-current/65',
  hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
  chevron: 'size-3.5 first:-ml-1 last:-mr-1',
  settingsGroup: 'group/settings',
  settingsTrigger: 'group hidden group-has-[[data-availability=available]]/settings:grid',
  settingsIcon: 'transition-transform duration-150 ease-in-out group-aria-expanded:rotate-90 motion-reduce:duration-0',
};
