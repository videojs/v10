import { styles } from 'vjsc/styles';

const defaultSurface = [
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
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const defaultAudioFeedbackSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-none! ring-0! after:hidden!',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:bg-[light-dark(white,black)]!',
  'contrast-more:bg-[light-dark(white,black)]!',
] as const;

const minimalAudioFeedbackSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-none! ring-0! after:hidden! backdrop-filter-none!',
] as const;

const icon = ['hidden shrink-0'] as const;

const iconVariants = {
  default: ['mix-blend-difference'],
  minimal: ['drop-shadow-[0_1px_0_var(--media-shadow-current-color)]'],
} as const;

export default styles({
  file: 'indicators.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: [
        'group/input-status pointer-events-none absolute origin-top text-inherit',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'top-3 rounded-[9999px] bg-black/25 font-medium',
          'data-starting-style:duration-250 data-starting-style:ease-in',
          'data-ending-style:duration-250 data-ending-style:ease-in',
          'pointer-coarse:[transition-property:scale,translate,opacity] pointer-coarse:will-change-[scale,translate,opacity]',
          'pointer-fine:motion-safe:[transition-property:scale,translate,filter,opacity]',
          'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
          'duration-100 ease-out',
          'pointer-fine:motion-safe:data-starting-style:scale-90 pointer-fine:motion-safe:data-starting-style:blur-sm',
          'pointer-fine:motion-safe:data-ending-style:scale-90 pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-1/4',
        ],
        minimal: [
          'inset-x-0 top-0 flex justify-center pt-3 pb-32',
          'status-indicator-gradient',
          'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
          'data-starting-style:duration-400 data-starting-style:ease-in',
          'data-ending-style:duration-400 data-ending-style:ease-in',
          'pointer-fine:[transition-property:translate,filter,opacity] pointer-fine:will-change-[translate,filter,opacity]',
          'pointer-coarse:[transition-property:translate,opacity] pointer-coarse:will-change-[translate,opacity]',
          'duration-100 ease-out',
          'pointer-fine:motion-safe:data-starting-style:blur-sm pointer-fine:motion-safe:data-ending-style:blur-sm',
          'motion-safe:data-ending-style:-translate-y-full',
        ],
        'default-audio': defaultAudioFeedbackSurface,
        'default-live-audio': defaultAudioFeedbackSurface,
        'minimal-audio': minimalAudioFeedbackSurface,
        'minimal-live-audio': minimalAudioFeedbackSurface,
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
