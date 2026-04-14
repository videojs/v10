import { cn } from '@videojs/utils/style';

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/50 via-black/30 to-transparent',
  'backdrop-blur-none backdrop-saturate-100',
  // Transitions
  'transition-[opacity,backdrop-filter]',
  'duration-(--media-controls-transition-duration)',
  'ease-out',
  // Shown when controls visible
  'peer-data-visible/controls:opacity-100',
  // Shown when error visible (+ blur)
  // Light DOM: peer/error is a direct sibling (React)
  'peer-data-open/error:opacity-100',
  'peer-data-open/error:duration-(--media-error-dialog-transition-duration)',
  'peer-data-open/error:delay-(--media-error-dialog-transition-delay)',
  'peer-data-open/error:backdrop-blur-lg peer-data-open/error:backdrop-saturate-150'
);
