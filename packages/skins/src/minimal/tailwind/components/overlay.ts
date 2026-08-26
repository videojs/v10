import { cn } from '@videojs/utils/style';

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/70 via-black/50 via-[--spacing(30)] to-transparent',
  'backdrop-blur-none backdrop-saturate-100',
  // Transitions
  'transition-[opacity,backdrop-filter]',
  'duration-(--media-controls-transition-duration)',
  'ease-out',
  // Shown when controls visible
  'data-visible:opacity-100',
  // Shown when buffering visible
  'peer-data-visible/buffering:bg-black/35',
  'peer-data-visible/buffering:opacity-100',
  'peer-data-visible/buffering:backdrop-blur-sm'
);
