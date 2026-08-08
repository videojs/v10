const buttonStyles = [
  'grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit',
  'cursor-pointer outline-2 outline-transparent -outline-offset-2',
  'hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
];

const buttonIconStyles = 'size-media-icon drop-shadow-media-icon';

export const button = buttonStyles;
export const fullscreenButton = [...buttonStyles, 'group/fullscreen'];
export const muteButton = [...buttonStyles, 'group/mute'];
export const playButton = [...buttonStyles, 'group/play'];
export const seekButton = buttonStyles;

export const fullscreenButtonIcon = {
  enter: [
    buttonIconStyles,
    'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
  ],
  exit: [
    buttonIconStyles,
    'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
  ],
};

export const playButtonIcon = {
  pause: [
    buttonIconStyles,
    'hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
    'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
  ],
  play: [
    buttonIconStyles,
    'hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block',
    'group-not-data-ended/play:group-data-paused/play:opacity-100',
    'group-not-data-ended/play:group-not-data-started/play:block',
    'group-not-data-ended/play:group-not-data-started/play:opacity-100',
  ],
  restart: [buttonIconStyles, 'hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100'],
};

export const seekButtonIcon = {
  backward: [buttonIconStyles, '-scale-x-100'],
  forward: buttonIconStyles,
};

export const muteButtonIcon = {
  volumeHigh: [
    buttonIconStyles,
    'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
    'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
  ],
  volumeLow: [
    buttonIconStyles,
    'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
    'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
  ],
  volumeOff: [buttonIconStyles, 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100'],
};

export const seekButtonLabel = 'tabular-nums';
