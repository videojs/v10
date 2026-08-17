import { defineStyles } from '../define';

export default defineStyles({
  role: 'controls',
  styles: {
    controls: [
      'absolute inset-x-media-controls-gap bottom-media-controls-gap z-10',
      'flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding',
      'font-media text-media leading-none text-media-controls',
      'bg-media-surface shadow-media-surface backdrop-blur-media-surface',
    ],
    controlsGroup: {
      primary: 'flex items-center gap-media-controls-gap',
      time: 'flex flex-1 items-center gap-media-controls-gap',
    },
    time: 'tabular-nums',
  },
});
