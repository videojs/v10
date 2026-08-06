import { surface } from '../components/popup.tailwind';

export const videoControls = [
  surface,
  'vjs-skin vjs-theme-default flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding',
  'font-media text-media leading-none text-media-controls',
];

export const controlsGroup = {
  base: 'flex items-center gap-media-controls-gap',
  time: 'flex flex-1 items-center gap-media-controls-gap',
};

export const time = 'tabular-nums';
