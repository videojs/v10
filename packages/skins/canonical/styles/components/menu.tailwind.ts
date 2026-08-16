import { defineStyles } from '../define';

const itemBase = [
  'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left',
  'outline-2 -outline-offset-2 outline-transparent',
  'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
  'focus-visible:outline-media-focus focus-visible:outline-offset-2',
  '[transition-property:color,background-color] [transition-duration:100ms] [transition-timing-function:ease-in-out]',
];

const group = 'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]';

export default defineStyles({
  role: 'menus',
  styles: {
    settings: [
      'm-0 min-w-48 max-w-(--media-popover-available-width) overflow-hidden rounded-xl border-0 p-1',
      'max-h-[min(var(--media-popover-available-height,14rem),14rem)] overscroll-none',
      'h-(--media-menu-height) w-(--media-menu-width)',
      '[transition-property:opacity,filter,transform,scale,width,height]',
      '[transition-duration:var(--media-popup-transition-duration),var(--media-popup-transition-duration),var(--media-popup-transition-duration),var(--media-popup-transition-duration),var(--media-menu-transition-duration),var(--media-menu-transition-duration)]',
      '[--media-menu-transition-duration:250ms]',
      '[&[data-submenu-expanded=true]>:not([data-submenu])]:-translate-x-full',
      '[&[data-submenu-expanded=true]>:not([data-submenu])]:[filter:blur(8px)]',
    ],
    menuGroup: group,
    radioGroup: group,
    itemBase,
    item: [
      'justify-between tabular-nums text-inherit',
      'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
      'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    ],
    submenuPanel: [
      'absolute inset-x-0 top-0 z-10 max-h-[inherit] overflow-auto overscroll-none p-1 outline-none',
      '[transition-property:translate,filter] [transition-duration:var(--media-menu-transition-duration)] [transition-timing-function:ease-out]',
      'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
      'data-starting-style:translate-x-full data-ending-style:translate-x-full',
      'data-starting-style:[filter:blur(8px)] data-ending-style:[filter:blur(8px)]',
    ],
    back: 'mb-0.5 w-full',
    separator: 'my-1 border-b border-media-surface',
    hint: 'ml-auto inline-flex min-w-0 items-center gap-1 pl-2 opacity-70',
    hintLabel: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
    tier: 'pl-0.5 text-[0.7em] font-semibold leading-none opacity-70',
    badge: 'rounded-media-pill bg-media-control-hover px-1.5 text-[0.7em] font-semibold',
    indicator: 'ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
    icon: 'size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100',
    chevron: 'size-3.5',
    chevronFlipped: 'rotate-180',
    settingsTrigger: 'group/settings',
    settingsIcon: [
      '[transition-property:transform] [transition-duration:150ms] [transition-timing-function:ease-in-out]',
      'group-aria-expanded/settings:rotate-90 motion-reduce:[transition-duration:0ms]',
    ],
    srOnly: 'sr-only',
  },
});
