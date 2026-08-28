import { styles } from 'vjsc/styles';

const popup = [
  'm-0 overflow-visible border-0 text-inherit',
  'data-starting-style:opacity-0 data-starting-style:[transform:scale(.95)]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:[transform:scale(.95)]',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:data-starting-style:[transform:translateY(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=bottom]:data-starting-style:[transform:translateY(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'data-[side=left]:data-starting-style:[transform:translateX(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=right]:data-starting-style:[transform:translateX(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
] as const;

const popupSafeArea = [
  'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
  'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
] as const;

const surfaceBase = [
  'text-white backdrop-blur-lg backdrop-saturate-150',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:ring-1 [@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-black contrast-more:ring-1 contrast-more:ring-transparent contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:ring-1 forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
] as const;

const defaultSurface = [
  ...surfaceBase,
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const minimalSurface = [
  ...surfaceBase,
  'shadow-sm shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/20',
  'contrast-more:shadow-sm contrast-more:shadow-black/20',
  'forced-colors:shadow-sm forced-colors:shadow-black/20',
  'bg-black/50',
] as const;

const defaultAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:bg-[light-dark(white,black)]!',
  'contrast-more:bg-[light-dark(white,black)]!',
] as const;

const minimalAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/20 ring-1 ring-[light-dark(rgb(0_0_0/0.1),rgb(255_255_255/0.1))]',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:backdrop-filter-none',
] as const;

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

const menuItemVariants = {
  default: [
    'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
  ],
  minimal: [
    'supports-[top:anchor(top)]:data-highlighted:[anchor-name:--media-menu-item-highlight-anchor]',
    'supports-[top:anchor(top)]:data-highlighted:bg-transparent',
  ],
} as const;

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

const menuIconVariants = {
  default: ['text-current/65'],
  minimal: ['text-current/50'],
} as const;

export default styles({
  file: 'menus.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-menu-popup',
      utilities: [
        ...popup,
        ...popupSafeArea,
        'm-0 min-w-44 max-w-(--media-menu-available-width) overflow-hidden! border-0 p-1',
        'max-h-[min(var(--media-menu-available-height,--spacing(56)),--spacing(56))] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        '[--media-menu-transition-duration:250ms] motion-reduce:[--media-menu-transition-duration:0ms]',
        '[transition-property:opacity,filter,transform,scale,width,height]',
        '[transition-duration:100ms,100ms,100ms,100ms,250ms,250ms] ease-out',
        'data-starting-style:[transition-duration:100ms] data-starting-style:[transition-property:opacity,filter,transform,scale]',
        'data-ending-style:[transition-duration:100ms] data-ending-style:[transition-property:opacity,filter,transform,scale]',
        'motion-reduce:[transition-duration:0ms]',
      ],
      variants: {
        default: [
          '[--media-popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]',
          'data-starting-style:blur-xs',
          ...defaultSurface,
          'rounded-[--spacing(3)] [--media-menu-item-border-radius:--spacing(2)]',
        ],
        minimal: [
          '[--media-popup-translate-distance:--spacing(2)]',
          ...minimalSurface,
          'rounded-[--spacing(2.5)] [--media-menu-item-border-radius:--spacing(1.5)]',
        ],
        'default-audio': defaultAudioSurface,
        'default-live-audio': defaultAudioSurface,
        'minimal-audio': minimalAudioSurface,
        'minimal-live-audio': minimalAudioSurface,
      },
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
      utilities: ['group/menu-radio-item', ...menuItem, ...menuItemOption],
      variants: menuItemVariants,
    },
    triggerItem: {
      className: 'media-menu-trigger-item',
      utilities: ['group/menu-trigger-item', ...menuItem, ...menuItemOption],
      variants: menuItemVariants,
    },
    backItem: {
      className: 'media-menu-back-item',
      utilities: ['group/menu-back-item', ...menuItem, 'mb-0.5 w-full'],
    },
    separator: {
      className: 'media-menu-separator',
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
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
      variants: menuIconVariants,
    },
    radioItemIcon: {
      className: 'media-menu-radio-item-icon',
      utilities: [
        ...menuIcon,
        'group-hover/menu-radio-item:text-inherit group-data-highlighted/menu-radio-item:text-inherit',
      ],
      variants: menuIconVariants,
    },
    forwardChevron: {
      className: 'media-menu-forward-chevron',
      utilities: [
        ...menuIcon,
        'size-3.5 [&:dir(rtl)]:[scale:-1_1]',
        'group-hover/menu-trigger-item:text-inherit group-data-highlighted/menu-trigger-item:text-inherit',
      ],
      variants: menuIconVariants,
    },
    backChevron: {
      className: 'media-menu-back-chevron',
      utilities: [
        ...menuIcon,
        'size-3.5 rotate-180 [&:dir(rtl)]:rotate-0 [&:dir(rtl)]:[scale:1_1]',
        'group-hover/menu-back-item:text-inherit group-data-highlighted/menu-back-item:text-inherit',
      ],
      variants: menuIconVariants,
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
