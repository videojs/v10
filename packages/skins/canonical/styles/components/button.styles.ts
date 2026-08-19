import { styles } from 'vjsc/styles';

const buttonStyles = [
  'grid min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-control border-0 bg-transparent p-0 text-center text-inherit',
  'cursor-pointer outline-2 outline-transparent -outline-offset-2',
  'transition-[background-color,color,outline-offset,scale] duration-150 ease-out motion-reduce:duration-50',
  'hover:bg-media-control-hover hover:text-media-accent-text focus-visible:bg-media-control-hover focus-visible:text-media-accent-text aria-expanded:bg-media-control-hover aria-expanded:text-media-accent-text',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'not-aria-disabled:active:scale-90',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
];

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-button',
      utilities: buttonStyles,
      variants: { default: 'size-9', minimal: 'size-9.5' },
    },
    icon: {
      className: 'media-button-icon',
      utilities: 'size-media-icon',
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
    airplay: {
      className: 'media-airplay-button',
      utilities: [
        'group/airplay',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
        'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
      ],
    },
    captions: {
      className: 'media-captions-button',
      utilities: 'group/captions',
    },
    cast: {
      className: 'media-cast-button',
      utilities: 'group/cast',
    },
    fullscreen: {
      className: 'media-fullscreen-button',
      utilities: 'group/fullscreen',
    },
    mute: {
      className: 'media-mute-button',
      utilities: 'group/mute',
    },
    pip: {
      className: 'media-pip-button',
      utilities: 'group/pip',
    },
    play: {
      className: 'media-play-button',
      utilities: 'group/play',
    },
    seek: {
      className: 'media-seek-button',
      utilities: '',
    },
    icons: {
      captionsOff: {
        className: 'media-captions-off-icon',
        utilities: 'hidden opacity-0 group-not-data-active/captions:block group-not-data-active/captions:opacity-100',
      },
      captionsOn: {
        className: 'media-captions-on-icon',
        utilities: 'hidden opacity-0 group-data-active/captions:block group-data-active/captions:opacity-100',
      },
      airplayEnter: {
        className: 'media-airplay-enter-icon',
        utilities: [
          'hidden opacity-0 group-not-data-[airplay-state=connected]/airplay:block',
          'group-not-data-[airplay-state=connected]/airplay:opacity-100',
        ],
      },
      airplayExit: {
        className: 'media-airplay-exit-icon',
        utilities: [
          'hidden opacity-0 group-data-[airplay-state=connected]/airplay:block',
          'group-data-[airplay-state=connected]/airplay:opacity-100',
        ],
      },
      castEnter: {
        className: 'media-cast-enter-icon',
        utilities: [
          'hidden opacity-0 group-not-data-[cast-state=connected]/cast:block',
          'group-not-data-[cast-state=connected]/cast:opacity-100',
        ],
      },
      castExit: {
        className: 'media-cast-exit-icon',
        utilities: [
          'hidden opacity-0 group-data-[cast-state=connected]/cast:block',
          'group-data-[cast-state=connected]/cast:opacity-100',
        ],
      },
      fullscreenEnter: {
        className: 'media-fullscreen-enter-icon',
        utilities: [
          'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
        ],
      },
      fullscreenExit: {
        className: 'media-fullscreen-exit-icon',
        utilities: [
          'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
        ],
      },
      pause: {
        className: 'media-pause-icon',
        utilities: [
          'hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
          'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
        ],
      },
      play: {
        className: 'media-play-icon',
        utilities: [
          'hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block',
          'group-not-data-ended/play:group-data-paused/play:opacity-100',
          'group-not-data-ended/play:group-not-data-started/play:block',
          'group-not-data-ended/play:group-not-data-started/play:opacity-100',
        ],
      },
      pipEnter: {
        className: 'media-pip-enter-icon',
        utilities: 'hidden opacity-0 group-not-data-pip/pip:block group-not-data-pip/pip:opacity-100',
      },
      pipExit: {
        className: 'media-pip-exit-icon',
        utilities: 'hidden opacity-0 group-data-pip/pip:block group-data-pip/pip:opacity-100',
      },
      restart: {
        className: 'media-restart-icon',
        utilities: 'hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100',
      },
      seekBackward: {
        className: 'media-seek-backward-icon',
        utilities: '-scale-x-100',
      },
      volumeHigh: {
        className: 'media-volume-high-icon',
        utilities: [
          'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
          'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
        ],
      },
      volumeLow: {
        className: 'media-volume-low-icon',
        utilities: [
          'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
          'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
        ],
      },
      volumeOff: {
        className: 'media-volume-off-icon',
        utilities: 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100',
      },
    },
    label: {
      className: 'media-seek-button-label',
      utilities: 'tabular-nums',
    },
  },
});
