import { styles } from 'vjsc/styles';

const icon = ['hidden shrink-0'] as const;

const iconVariants = {
  default: ['mix-blend-difference'],
  minimal: ['drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]'],
} as const;

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: [
        'group/input-status pointer-events-none absolute origin-top text-inherit',
        'duration-100 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          'top-3 rounded-[9999px] bg-black/25 font-medium',
          'data-starting-style:duration-250 data-starting-style:ease-in',
          'data-ending-style:duration-250 data-ending-style:ease-in',
          'pointer-coarse:transition-[scale,translate,opacity] pointer-coarse:will-change-[scale,translate,opacity]',
          'pointer-fine:motion-safe:transition-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
          'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-1/4',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32',
          'status-indicator-gradient',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
          'data-starting-style:duration-400 data-starting-style:ease-in',
          'data-ending-style:duration-400 data-ending-style:ease-in',
          'pointer-fine:transition-[translate,filter,opacity] pointer-fine:will-change-[translate,filter,opacity]',
          'pointer-coarse:transition-[translate,opacity] pointer-coarse:will-change-[translate,opacity]',
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
        minimal: [
          '[@media(prefers-reduced-transparency:reduce)]:rounded-[--spacing(2)]',
          '[@media(prefers-reduced-transparency:reduce)]:bg-black',
          'contrast-more:rounded-[--spacing(2)] contrast-more:bg-black',
        ],
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
      variants: { default: 'mix-blend-difference', minimal: '' },
    },
  },
});
