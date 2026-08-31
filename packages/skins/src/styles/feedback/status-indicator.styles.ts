import { styles } from 'vjsc/styles';

const icon = ['hidden shrink-0'] as const;

const iconVariants = {
  default: ['mix-blend-difference'],
  minimal: ['drop-shadow-media-icon'],
} as const;

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: [
        'group/input-status pointer-events-none absolute origin-top text-inherit',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
        'duration-100 ease-out',
      ],
      variants: {
        default: [
          'bg-media-popover text-media-popover-foreground backdrop-blur-lg backdrop-saturate-150',
          'ring-1 ring-media-border shadow-media-sm',
          'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
          'after:shadow-media-surface-inset',
          'opaque:bg-media-background opaque:backdrop-filter-none',
          'opaque:after:shadow-media-surface-inset-opaque',
          'forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:ring-[CanvasText]',
          'forced-colors:after:shadow-media-surface-inset-forced',
          'top-3 rounded-[9999px] bg-black/25 font-medium',
          'data-starting-style:duration-250 data-starting-style:ease-in',
          'data-ending-style:duration-250 data-ending-style:ease-in',
          'pointer-coarse:[transition-property:scale,translate,opacity] pointer-coarse:will-change-[scale,translate,opacity]',
          'pointer-fine:motion-safe:[transition-property:scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
          'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-1/4',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32',
          'bg-[linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_calc(var(--media-spacing)*12),transparent)]',
          'text-shadow-media',
          'data-starting-style:duration-400 data-starting-style:ease-in',
          'data-ending-style:duration-400 data-ending-style:ease-in',
          'pointer-fine:[transition-property:translate,filter,opacity] pointer-fine:will-change-[translate,filter,opacity]',
          'pointer-coarse:[transition-property:translate,opacity] pointer-coarse:will-change-[translate,opacity]',
          'pointer-fine:motion-safe:data-starting-style:blur-sm pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    },
    content: {
      className: 'media-status-indicator-content',
      utilities: 'flex items-center justify-between gap-2 px-2.5 py-1',
      variants: {
        default: 'w-full',
        minimal: ['opaque:rounded-[--spacing(2)] opaque:bg-black'],
      },
    },
    captionsOnIcon: {
      className: 'media-status-indicator-captions-on-icon',
      utilities: [...icon, 'group-data-[status=captions-on]/input-status:block'],
      variants: iconVariants,
    },
    captionsOffIcon: {
      className: 'media-status-indicator-captions-off-icon',
      utilities: [...icon, 'group-data-[status=captions-off]/input-status:block'],
      variants: iconVariants,
    },
    fullscreenEnterIcon: {
      className: 'media-status-indicator-fullscreen-enter-icon',
      utilities: [...icon, 'group-data-[status=fullscreen]/input-status:block'],
      variants: iconVariants,
    },
    fullscreenExitIcon: {
      className: 'media-status-indicator-fullscreen-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-fullscreen]/input-status:block'],
      variants: iconVariants,
    },
    pipEnterIcon: {
      className: 'media-status-indicator-pip-enter-icon',
      utilities: [...icon, 'group-data-[status=pip]/input-status:block'],
      variants: iconVariants,
    },
    pipExitIcon: {
      className: 'media-status-indicator-pip-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-pip]/input-status:block'],
      variants: iconVariants,
    },
    value: {
      className: 'media-status-indicator-value',
      utilities: 'ml-auto',
      variants: { default: 'mix-blend-difference' },
    },
  },
});
