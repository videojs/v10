const base = [
  'grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit',
  'cursor-pointer outline-2 outline-transparent -outline-offset-2',
  'hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
];

const icon = 'size-media-icon drop-shadow-media-icon';

export const button = {
  base,
  fullscreen: [base, 'group/fullscreen'],
  mute: [base, 'group/mute'],
  play: [base, 'group/play'],
  seek: base,
};

export const buttonIcon = {
  base: icon,
  fullscreenEnter: [
    icon,
    'hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100',
  ],
  fullscreenExit: [
    icon,
    'hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100',
  ],
  pause: [
    icon,
    'hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
    'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
  ],
  play: [
    icon,
    'hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block',
    'group-not-data-ended/play:group-data-paused/play:opacity-100',
    'group-not-data-ended/play:group-not-data-started/play:block',
    'group-not-data-ended/play:group-not-data-started/play:opacity-100',
  ],
  restart: [icon, 'hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100'],
  seekBackward: [icon, '-scale-x-100'],
  volumeHigh: [
    icon,
    'hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
    'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100',
  ],
  volumeLow: [
    icon,
    'hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block',
    'group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100',
  ],
  volumeOff: [icon, 'hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100'],
};

export const seekLabel = 'tabular-nums';
