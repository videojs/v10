import { styles } from 'vjsc/styles';

const menuItem = [
  'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 px-2 py-1.5 text-start',
  'outline-2 -outline-offset-2 outline-transparent',
  'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
  'focus-visible:outline-white focus-visible:outline-offset-2',
  'transition-[color,background-color] duration-100 ease-in-out motion-reduce:duration-50',
  'supports-[top:anchor(top)]:duration-50 supports-[top:anchor(top)]:hover:duration-200 supports-[top:anchor(top)]:data-highlighted:duration-200',
];

const group = [
  'flex [max-height:inherit] flex-col gap-0.5 [anchor-scope:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:absolute',
  'supports-[top:anchor(top)]:before:[position-anchor:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:[inset:anchor(inside)]',
  'supports-[top:anchor(top)]:before:[overflow-anchor:none]',
  'supports-[top:anchor(top)]:before:pointer-events-none',
  'supports-[top:anchor(top)]:before:rounded-[inherit]',
  'supports-[top:anchor(top)]:before:bg-media-control-hover',
  'supports-[top:anchor(top)]:before:transition-[inset] supports-[top:anchor(top)]:before:duration-100 supports-[top:anchor(top)]:before:ease-in-out',
  'supports-[top:anchor(top)]:has-data-[highlighted=]:before:duration-0',
];

export default styles({
  file: 'menus.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-settings',
      utilities: [
        'm-0 min-w-48 max-w-(--media-popover-available-width) overflow-hidden! border-0 p-1',
        'max-h-[min(var(--media-popover-available-height,14rem),14rem)] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        '[--media-menu-transition-duration:250ms] motion-reduce:[--media-menu-transition-duration:0ms]',
        'transition-settings-menu',
      ],
      variants: {
        default: 'rounded-[--spacing(3)]',
        minimal: 'rounded-[--spacing(2.5)]',
      },
    },
    content: {
      className: 'media-menu-content',
      utilities: [
        ...group,
        'absolute inset-x-1 top-1 max-h-[inherit] overflow-auto overscroll-none outline-none',
        '[--media-menu-parent-translate:-100%] [&:dir(rtl)]:[--media-menu-parent-translate:100%]',
        'transition-[translate,filter] duration-(--media-menu-transition-duration) ease-out',
        'data-[child-open]:[translate:var(--media-menu-parent-translate)_0]',
        'data-[child-open]:blur-sm data-[child-open]:before:hidden',
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
      variants: {
        default: [
          'rounded-[--spacing(2)] text-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
          'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
          'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
        ],
        minimal: [
          'rounded-[--spacing(1.5)] text-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
          'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
          'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
        ],
      },
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
        'absolute inset-x-0 top-0 z-10 [max-height:inherit] overflow-auto overscroll-none p-1 outline-none',
        '[--media-submenu-translate:100%] [&:dir(rtl)]:[--media-submenu-translate:-100%]',
        'transition-[translate,filter] duration-(--media-menu-transition-duration) ease-out',
        'data-starting-style:pointer-events-none data-ending-style:pointer-events-none',
        'data-starting-style:overflow-hidden data-ending-style:overflow-hidden',
        'data-starting-style:[translate:var(--media-submenu-translate)_0] data-ending-style:[translate:var(--media-submenu-translate)_0]',
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
        'block',
        '[@media(prefers-reduced-transparency:reduce)]:border-white/25 contrast-more:border-white/25',
        'forced-colors:border-[CanvasText]',
      ],
      variants: {
        default: 'my-1 border-b border-black/10 shadow-[0_1px_0_0_rgb(255_255_255/0.075)]',
        minimal: 'my-1 border-b border-white/10',
      },
    },
    hint: {
      className: 'media-hint',
      utilities: 'ms-auto inline-flex min-w-0 items-center gap-1 ps-2 text-current/65',
    },
    hintLabel: {
      className: 'media-hint-label',
      utilities: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
    },
    tier: {
      className: 'media-tier',
      utilities: 'ps-0.5 pt-px text-[0.7em] font-semibold leading-none text-current/70',
    },
    badge: {
      className: 'media-badge',
      utilities: 'rounded-media-control bg-media-control-hover px-1.5 text-[0.7em] font-semibold',
    },
    indicator: {
      className: 'media-indicator',
      utilities: 'ms-auto -me-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100',
    },
    icon: {
      className: 'media-icon',
      utilities:
        'size-media-icon shrink-0 group-hover/menu-item:text-inherit group-data-highlighted/menu-item:text-inherit',
      variants: {
        default: 'text-current/65 drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'text-current/50 drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    chevron: {
      className: 'media-chevron',
      utilities: 'size-3.5 [&:dir(rtl)]:[scale:-1_1]',
    },
    flippedChevron: {
      className: 'media-chevron-flipped',
      utilities: 'rotate-180 [&:dir(rtl)]:rotate-0 [&:dir(rtl)]:[scale:1_1]',
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
