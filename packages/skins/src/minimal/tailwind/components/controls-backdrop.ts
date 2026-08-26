import { cn } from '@videojs/utils/style';

export const controlsBackdrop = cn(
  'pointer-events-none absolute inset-0 z-10 rounded-[inherit]',
  'bg-linear-to-t from-black/70 via-black/50 via-[--spacing(30)] to-transparent',
  'transition-opacity duration-(--media-controls-transition-duration) ease-out not-data-visible:opacity-0'
);
