import { styles } from 'vjsc/styles';

const menuItem = [
  'relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-menu-item px-2 py-1.5 text-start whitespace-nowrap',
  'focus-ring-media',
  'hover:highlight-media data-highlighted:highlight-media',
  'focus-visible:outline-media-ring focus-visible:outline-offset-2',
  'text-shadow-media',
  'transition-[background-color,color] duration-media-fast [transition-timing-function:ease-in-out]',
  'supports-[top:anchor(top)]:duration-media-instant supports-[top:anchor(top)]:hover:duration-media-slow supports-[top:anchor(top)]:data-highlighted:duration-media-slow',
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
  'supports-[top:anchor(top)]:before:anchor-media-highlight',
  'supports-[top:anchor(top)]:has-data-[highlighted=]:before:duration-0',
] as const;

const menuGroup = ['flex [max-height:inherit] flex-col gap-0.5', ...menuHighlight] as const;

const menuIcon = ['shrink-0 drop-shadow-media-icon text-media-muted-foreground'] as const;

const menuChevron = [...menuIcon, 'size-media-icon-sm'] as const;

export default styles({
  file: 'menus.css',
  rules: {
    popup: {
      className: 'media-menu-popup',
      utilities: [
        'm-0 min-w-44 max-w-(--media-menu-available-width) overflow-hidden! rounded-media-popup border-0 p-1 [--media-popup-side-offset:var(--media-popover-side-offset)]',
        'max-h-[min(var(--media-menu-available-height,--spacing(56)),--spacing(56))] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        'transition-media-popup data-starting-style:transition-media-popup data-ending-style:transition-media-popup',
      ],
    },
    resizablePopup: {
      className: 'media-menu-resizable-popup',
      utilities: [
        '[transition-property:opacity,filter,transform,scale,width,height]',
        '[transition-duration:var(--media-duration-fast),var(--media-duration-fast),var(--media-duration-fast),var(--media-duration-fast),var(--media-menu-transition-duration),var(--media-menu-transition-duration)]',
      ],
    },
    content: {
      className: 'media-menu-content',
      utilities: [
        ...menuHighlight,
        'absolute max-h-[inherit] overflow-auto overscroll-none outline-hidden',
        'not-data-submenu:flex not-data-submenu:flex-col not-data-submenu:gap-0.5',
        'transition-[translate,filter] duration-media-menu ease-out',
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
      utilities: 'my-1 block border-b border-media-border media-opaque:border-media-foreground/25',
    },
    hint: {
      className: 'media-menu-hint',
      utilities: 'ms-auto inline-flex min-w-0 items-center gap-1 ps-2 text-current/65',
    },
    hintLabel: {
      className: 'media-menu-hint-label',
      utilities: 'max-w-24 truncate',
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
        'size-media-icon',
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
    },
    radioItemIcon: {
      className: 'media-menu-radio-item-icon',
      utilities: [
        ...menuIcon,
        'size-media-icon',
        'group-hover/menu-radio-item:text-inherit group-data-highlighted/menu-radio-item:text-inherit',
      ],
    },
    forwardChevron: {
      className: 'media-menu-forward-chevron',
      utilities: [
        ...menuChevron,
        '[&:dir(rtl)]:[scale:-1_1]',
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
    },
    backChevron: {
      className: 'media-menu-back-chevron',
      utilities: [
        ...menuChevron,
        'rotate-180 [&:dir(rtl)]:rotate-0 [&:dir(rtl)]:[scale:1_1]',
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
        'transition-transform duration-media-base ease-in-out motion-reduce:transition-none!',
        'group-aria-expanded/settings:rotate-90',
      ],
    },
    triggerLabel: {
      className: 'media-settings-menu-trigger-label',
      utilities: 'sr-only',
    },
  },
});
