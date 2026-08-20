import { styles } from 'vjsc/styles';

const menuItem = [
  'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left',
  'outline-2 -outline-offset-2 outline-transparent',
  'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'transition-[color,background-color] duration-100 ease-in-out motion-reduce:duration-50',
];

const group = 'relative flex flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]';

export default styles({
  file: 'menus.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-settings',
      utilities: [
        'm-0 min-w-48 max-w-(--media-popover-available-width) overflow-hidden rounded-xl border-0 p-1',
        'max-h-[min(var(--media-popover-available-height,14rem),14rem)] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        'transition-settings-menu',
        '[&[data-submenu-expanded=true]>:not([data-submenu])]:-translate-x-full',
        '[&[data-submenu-expanded=true]>:not([data-submenu])]:blur-sm',
      ],
    },
    group: {
      className: 'media-menu-group',
      utilities: group,
    },
    radioGroup: {
      className: 'media-radio-group',
      utilities: group,
    },
    item: {
      className: 'media-menu-item',
      utilities: menuItem,
    },
    option: {
      className: 'media-item',
      utilities: [
        'justify-between tabular-nums text-inherit',
        'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
        'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
      ],
    },
    submenu: {
      className: 'media-submenu-panel',
      utilities: [
        'absolute inset-x-0 top-0 z-10 max-h-[inherit] overflow-auto overscroll-none p-1 outline-none',
        'transition-[translate,filter] duration-250 ease-out',
        'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
        'data-starting-style:translate-x-full data-ending-style:translate-x-full',
        'data-starting-style:blur-sm data-ending-style:blur-sm',
      ],
    },
    back: {
      className: 'media-back',
      utilities: 'mb-0.5 w-full',
    },
    separator: {
      className: 'media-separator',
      utilities: [
        'my-1 border-b border-white/10',
        '[@media(prefers-reduced-transparency:reduce)]:border-white/25 contrast-more:border-white/25',
        'forced-colors:border-[CanvasText]',
      ],
    },
    hint: {
      className: 'media-hint',
      utilities: 'ml-auto inline-flex min-w-0 items-center gap-1 pl-2 opacity-70',
    },
    hintLabel: {
      className: 'media-hint-label',
      utilities: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
    },
    tier: {
      className: 'media-tier',
      utilities: 'pl-0.5 text-[0.7em] font-semibold leading-none opacity-70',
    },
    badge: {
      className: 'media-badge',
      utilities: 'rounded-media-control bg-media-control-hover px-1.5 text-[0.7em] font-semibold',
    },
    indicator: {
      className: 'media-indicator',
      utilities: 'ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
    },
    icon: {
      className: 'media-icon',
      utilities: 'size-media-icon shrink-0 opacity-70 group-hover/menu-item:opacity-100',
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    chevron: {
      className: 'media-chevron',
      utilities: 'size-3.5',
    },
    flippedChevron: {
      className: 'media-chevron-flipped',
      utilities: 'rotate-180',
    },
    trigger: {
      className: 'media-settings-trigger',
      utilities: 'group/settings',
    },
    triggerIcon: {
      className: 'media-settings-icon',
      utilities: [
        'transition-transform duration-150 ease-in-out',
        'group-aria-expanded/settings:rotate-90 motion-reduce:duration-0',
      ],
    },
    srOnly: {
      className: 'media-sr-only',
      utilities: 'sr-only',
    },
  },
});
