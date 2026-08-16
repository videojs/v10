import { defineStyles, variants } from '../define';

const buttonStyles = [
  'grid min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-control border-0 bg-transparent p-0 text-center text-inherit',
  'cursor-pointer outline-2 outline-transparent -outline-offset-2',
  'transition-[background-color,color,outline-offset,scale] duration-150 ease-out motion-reduce:duration-50',
  'hover:bg-media-control-hover hover:text-media-accent-text focus-visible:bg-media-control-hover focus-visible:text-media-accent-text aria-expanded:bg-media-control-hover aria-expanded:text-media-accent-text',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'not-aria-disabled:active:scale-90',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
];

export default defineStyles({
  role: 'buttons',
  styles: {
    button: variants({ base: buttonStyles, variants: { default: 'size-9', minimal: 'size-9.5' } }),
    buttonIcon: variants({
      base: 'size-media-icon',
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    }),
    airplayButton: [
      'group/airplay',
      'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
      'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
    ],
    captionsButton: 'group/captions',
    castButton: 'group/cast',
    fullscreenButton: 'group/fullscreen',
    muteButton: 'group/mute',
    pipButton: 'group/pip',
    playButton: 'group/play',
    seekButton: '',
    captionsOffIcon: 'hidden opacity-0 group-not-data-active/captions:block group-not-data-active/captions:opacity-100',
    captionsOnIcon: 'hidden opacity-0 group-data-active/captions:block group-data-active/captions:opacity-100',
    airplayEnterIcon: [
      'hidden opacity-0 group-not-data-[airplay-state=connected]/airplay:block',
      'group-not-data-[airplay-state=connected]/airplay:opacity-100',
    ],
    airplayExitIcon: [
      'hidden opacity-0 group-data-[airplay-state=connected]/airplay:block',
      'group-data-[airplay-state=connected]/airplay:opacity-100',
    ],
    castEnterIcon: [
      'hidden opacity-0 group-not-data-[cast-state=connected]/cast:block',
      'group-not-data-[cast-state=connected]/cast:opacity-100',
    ],
    castExitIcon: [
      'hidden opacity-0 group-data-[cast-state=connected]/cast:block',
      'group-data-[cast-state=connected]/cast:opacity-100',
    ],
    fullscreenEnterIcon: [
      'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
    ],
    fullscreenExitIcon: [
      'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
    ],
    pauseIcon: [
      'hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
      'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
    ],
    playIcon: [
      'hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block',
      'group-not-data-ended/play:group-data-paused/play:opacity-100',
      'group-not-data-ended/play:group-not-data-started/play:block',
      'group-not-data-ended/play:group-not-data-started/play:opacity-100',
    ],
    pipEnterIcon: 'hidden opacity-0 group-not-data-pip/pip:block group-not-data-pip/pip:opacity-100',
    pipExitIcon: 'hidden opacity-0 group-data-pip/pip:block group-data-pip/pip:opacity-100',
    restartIcon: 'hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100',
    seekBackwardIcon: '-scale-x-100',
    volumeHighIcon: [
      'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
      'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
    ],
    volumeLowIcon: [
      'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
      'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
    ],
    volumeOffIcon: 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100',
    seekButtonLabel: 'tabular-nums',
  },
});
