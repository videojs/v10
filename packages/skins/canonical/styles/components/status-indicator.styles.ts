import { styles } from 'vjsc/styles';
import { defaultSurface } from './popup.styles';

export default styles({
  file: 'indicator.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: [
        'group/input-status pointer-events-none flex items-center gap-2 font-medium',
        'transition-[opacity,scale,translate] duration-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'absolute top-3 rounded-media-control bg-black/25 px-2.5 py-1',
          'data-starting-style:scale-90',
          'data-ending-style:-translate-y-1/4 data-ending-style:scale-90',
        ],
        minimal: [
          'absolute inset-x-0 top-0 w-full justify-center px-2.5 pt-3 pb-32',
          'status-indicator-gradient',
          'data-starting-style:scale-100 data-ending-style:scale-100 motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    },
    icon: {
      className: 'media-status-indicator-icon',
      utilities: 'hidden shrink-0',
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
          'transition-[opacity,scale] duration-200 ease-out motion-reduce:duration-50 data-starting-style:scale-85 data-starting-style:opacity-0',
          'data-ending-style:scale-85 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:data-ending-style:duration-50',
        ],
        variants: { default: 'rounded-media-control bg-black/35 backdrop-blur-sm', minimal: '' },
      },
      icon: {
        className: 'media-playback-status-icon',
        utilities: 'hidden size-media-icon-lg',
      },
      play: {
        className: 'media-status-play-icon',
        utilities:
          'group-data-[status=play]/playback-status:block group-data-[status=play]/playback-status:translate-x-px',
      },
      pause: {
        className: 'media-status-pause-icon',
        utilities: 'group-data-[status=pause]/playback-status:block',
      },
    },
  },
});
