import { styles } from 'vjsc/styles';

import { defaultSurface } from './popup.styles';

export default styles({
  file: 'indicator.css',
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
          ...defaultSurface,
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
        default: 'w-full [&>*]:mix-blend-difference',
        minimal: [
          '[@media(prefers-reduced-transparency:reduce)]:rounded-[--spacing(2)]',
          '[@media(prefers-reduced-transparency:reduce)]:bg-black',
          'contrast-more:rounded-[--spacing(2)] contrast-more:bg-black',
        ],
      },
    },
    icon: {
      className: 'media-status-indicator-icon',
      utilities: 'hidden shrink-0',
      variants: { default: '', minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]' },
    },
    value: {
      className: 'media-status-indicator-value',
      utilities: 'ml-auto',
    },
    icons: {
      captionsOn: {
        className: 'media-status-captions-on-icon',
        utilities: 'group-data-[status=captions-on]/input-status:block',
      },
      captionsOff: {
        className: 'media-status-captions-off-icon',
        utilities: 'group-data-[status=captions-off]/input-status:block',
      },
      fullscreenEnter: {
        className: 'media-status-fullscreen-enter-icon',
        utilities: 'group-data-[status=fullscreen]/input-status:block',
      },
      fullscreenExit: {
        className: 'media-status-fullscreen-exit-icon',
        utilities: 'group-data-[status=exit-fullscreen]/input-status:block',
      },
      pipEnter: {
        className: 'media-status-pip-enter-icon',
        utilities: 'group-data-[status=pip]/input-status:block',
      },
      pipExit: {
        className: 'media-status-pip-exit-icon',
        utilities: 'group-data-[status=exit-pip]/input-status:block',
      },
    },
    playback: {
      root: {
        className: 'media-playback-status-indicator',
        utilities: [
          'group/playback-status col-start-2 row-start-1 grid place-content-center p-4 text-center',
          'transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-opacity motion-reduce:duration-50',
          'data-starting-style:scale-85 data-starting-style:opacity-0',
          'data-ending-style:scale-85 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in',
          'motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100',
        ],
        variants: { default: 'rounded-[9999px] bg-black/35 backdrop-blur-sm', minimal: '' },
      },
      icon: {
        className: 'media-playback-status-icon',
        utilities: [
          'col-start-1 row-start-1 scale-0 opacity-0',
          'transition-[opacity,scale] duration-150 ease-out',
          'motion-reduce:scale-100 motion-reduce:transition-opacity motion-reduce:duration-50',
        ],
        variants: { default: 'size-media-icon-lg', minimal: 'size-media-icon-xl' },
      },
      play: {
        className: 'media-status-play-icon',
        utilities:
          'group-data-[status=play]/playback-status:scale-100 group-data-[status=play]/playback-status:opacity-100 group-data-[status=play]/playback-status:translate-x-px',
      },
      pause: {
        className: 'media-status-pause-icon',
        utilities:
          'group-data-[status=pause]/playback-status:scale-100 group-data-[status=pause]/playback-status:opacity-100',
      },
    },
  },
});
