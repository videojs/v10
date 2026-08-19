import { defineStyles } from '../define';

export default defineStyles({
  role: 'container',
  styles: {
    container: [
      'relative isolate block h-full w-full overflow-hidden rounded-media-surface bg-black @container/media-container',
      '[&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:rounded-[inherit]',
      '[&_video]:[object-fit:var(--media-object-fit,contain)]',
      '[&_video]:[object-position:var(--media-object-position,center)]',
    ],
  },
});
