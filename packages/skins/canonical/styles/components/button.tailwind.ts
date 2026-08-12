import { defineStyles } from '../define';

const buttonStyles = [
  'grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit',
  'cursor-pointer outline-2 outline-transparent -outline-offset-2',
  'hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
];

export default defineStyles({
  role: 'buttons',
  styles: {
    button: buttonStyles,
    buttonIcon: 'size-media-icon drop-shadow-media-icon',
    fullscreenButton: 'group/fullscreen',
    muteButton: 'group/mute',
    playButton: 'group/play',
    seekButton: '',
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
