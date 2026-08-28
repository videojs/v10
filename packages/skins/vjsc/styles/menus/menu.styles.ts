import { styles } from 'vjsc/styles';

import { popoverSafeArea, popupPosition, popupSurface } from '../recipes/popup';
import { themeRecipe } from '../recipes/theme';

const menuItem = [
  'relative flex cursor-pointer select-none items-center gap-1.5 rounded-(--media-menu-item-border-radius) px-2 py-1.5 text-start whitespace-nowrap',
  'outline-2 -outline-offset-2 outline-transparent',
  'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
  'focus-visible:outline-white focus-visible:outline-offset-2',
  'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
  'transition-[background-color,color] duration-100 [transition-timing-function:ease-in-out] motion-reduce:duration-50',
  'supports-[top:anchor(top)]:duration-50 supports-[top:anchor(top)]:hover:duration-200 supports-[top:anchor(top)]:data-highlighted:duration-200',
] as const;

const menuItemOption = [
  'justify-between tabular-nums text-inherit',
  'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
  'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
] as const;

const menuItemHighlight = [
  'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
] as const;

const menuHighlight = [
  '[anchor-scope:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:absolute',
  'supports-[top:anchor(top)]:before:[position-anchor:--media-menu-item-highlight-anchor]',
  'supports-[top:anchor(top)]:before:[inset:anchor(inside)]',
  'supports-[top:anchor(top)]:before:[overflow-anchor:none]',
  'supports-[top:anchor(top)]:before:pointer-events-none',
  'supports-[top:anchor(top)]:before:rounded-(--media-menu-item-border-radius)',
  'supports-[top:anchor(top)]:before:bg-media-control-hover',
  'supports-[top:anchor(top)]:before:transition-[inset] supports-[top:anchor(top)]:before:duration-100 supports-[top:anchor(top)]:before:[transition-timing-function:ease-in-out]',
  'supports-[top:anchor(top)]:has-data-[highlighted=]:before:duration-0',
] as const;

const menuGroup = ['flex [max-height:inherit] flex-col gap-0.5', ...menuHighlight] as const;

const menuIcon = ['size-media-icon shrink-0 drop-shadow-[0_1px_0_var(--media-shadow-current-color)]'] as const;

export default styles({
  file: 'menus.css',
  rules: {
    popup: {
      className: 'media-menu-popup',
      utilities: [
        ...popupPosition,
        ...popoverSafeArea,
        ...popupSurface,
        'm-0 min-w-44 max-w-(--media-menu-available-width) overflow-hidden! border-0 p-1',
        'max-h-[min(var(--media-menu-available-height,--spacing(56)),--spacing(56))] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        'motion-reduce:[--media-menu-transition-duration:0ms]',
        '[transition-property:opacity,filter,transform,scale,width,height]',
        '[transition-duration:100ms,100ms,100ms,100ms,250ms,250ms] ease-out',
        'data-starting-style:[transition-duration:100ms] data-starting-style:[transition-property:opacity,filter,transform,scale]',
        'data-ending-style:[transition-duration:100ms] data-ending-style:[transition-property:opacity,filter,transform,scale]',
        'motion-reduce:[transition-duration:0ms]!',
        ...themeRecipe('rounded-[--spacing(3)]', 'rounded-[--spacing(2.5)]'),
      ],
    },
    content: {
      className: 'media-menu-content',
      utilities: [
        ...menuHighlight,
        'absolute max-h-[inherit] overflow-auto overscroll-none outline-none',
        'not-data-submenu:flex not-data-submenu:flex-col not-data-submenu:gap-0.5',
        'transition-[translate,filter] duration-(--media-menu-transition-duration) ease-out',
        'not-data-submenu:inset-x-1 not-data-submenu:top-1',
        'not-data-submenu:data-[child-open]:-translate-x-full',
        'not-data-submenu:data-[child-open]:[&:dir(rtl)]:translate-x-full',
        'not-data-submenu:data-[child-open]:blur-sm',
        'not-data-submenu:data-[child-open]:before:hidden',
        'data-submenu:inset-x-0 data-submenu:top-0 data-submenu:z-10 data-submenu:[max-height:inherit] data-submenu:p-1',
        'data-submenu:data-starting-style:pointer-events-none data-submenu:data-ending-style:pointer-events-none',
        'data-submenu:data-starting-style:overflow-hidden data-submenu:data-ending-style:overflow-hidden',
        'data-submenu:data-starting-style:translate-x-full data-submenu:data-ending-style:translate-x-full',
        'data-submenu:data-starting-style:[&:dir(rtl)]:-translate-x-full data-submenu:data-ending-style:[&:dir(rtl)]:-translate-x-full',
        'data-submenu:data-starting-style:blur-sm data-submenu:data-ending-style:blur-sm',
      ],
    },
    radioGroup: {
      className: 'media-menu-radio-group',
      utilities: menuGroup,
    },
    radioItem: {
      className: 'media-menu-radio-item',
      utilities: ['group/menu-radio-item', ...menuItem, ...menuItemOption, ...menuItemHighlight],
    },
    triggerItem: {
      className: 'media-menu-trigger-item',
      utilities: ['group/menu-trigger-item', ...menuItem, ...menuItemOption, ...menuItemHighlight],
    },
    backItem: {
      className: 'media-menu-back-item',
      utilities: ['group/menu-back-item', ...menuItem, 'mb-0.5 w-full'],
    },
    separator: {
      className: 'media-menu-separator',
      utilities: [
        'my-1 block border-b border-media-border',
        '[@media(prefers-reduced-transparency:reduce)]:border-white/25 contrast-more:border-white/25',
        'forced-colors:border-[CanvasText]',
      ],
    },
    hint: {
      className: 'media-menu-hint',
      utilities: 'ms-auto inline-flex min-w-0 items-center gap-1 ps-2 text-current/65',
    },
    hintLabel: {
      className: 'media-menu-hint-label',
      utilities: 'max-w-24 overflow-hidden text-ellipsis whitespace-nowrap',
    },
    tier: {
      className: 'media-menu-tier',
      utilities: 'ps-0.5 pt-px text-media-xs font-semibold leading-none text-current/70',
    },
    badge: {
      className: 'media-menu-badge',
      utilities: 'rounded-media-control bg-media-control-hover px-1.5 text-media-xs font-semibold',
    },
    itemIndicator: {
      className: 'media-menu-item-indicator',
      utilities: 'ms-auto -me-1 shrink-0 opacity-0 group-aria-checked/menu-radio-item:opacity-100',
    },
    triggerItemIcon: {
      className: 'media-menu-trigger-item-icon',
      utilities: [
        ...menuIcon,
        'text-media-muted-foreground',
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
    },
    radioItemIcon: {
      className: 'media-menu-radio-item-icon',
      utilities: [
        ...menuIcon,
        'text-media-muted-foreground',
        'group-hover/menu-radio-item:text-inherit group-data-highlighted/menu-radio-item:text-inherit',
      ],
    },
    forwardChevron: {
      className: 'media-menu-forward-chevron',
      utilities: [
        ...menuIcon,
        'size-3.5 text-media-muted-foreground [&:dir(rtl)]:[scale:-1_1]',
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
    },
    backChevron: {
      className: 'media-menu-back-chevron',
      utilities: [
        ...menuIcon,
        'size-3.5 rotate-180 text-media-muted-foreground [&:dir(rtl)]:rotate-0 [&:dir(rtl)]:[scale:1_1]',
        'group-hover/menu-back-item:text-inherit group-data-highlighted/menu-back-item:text-inherit',
      ],
    },
    settingsTrigger: {
      className: 'media-settings-menu-trigger',
      utilities: 'group/settings',
    },
    settingsTriggerIcon: {
      className: 'media-settings-menu-trigger-icon',
      utilities: [
        'transition-transform duration-150 ease-in-out motion-reduce:transition-none! motion-reduce:duration-0!',
        'group-aria-expanded/settings:rotate-90',
      ],
    },
    triggerLabel: {
      className: 'media-settings-menu-trigger-label',
      utilities: 'sr-only',
    },
  },
});
