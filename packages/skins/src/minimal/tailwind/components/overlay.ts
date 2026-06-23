import { cn } from '@videojs/utils/style';

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/70 via-black/50 via-[7.5rem] to-transparent',
  'backdrop-blur-none backdrop-saturate-100',
  // Transitions
  'transition-[opacity,backdrop-filter]',
  'duration-(--media-controls-transition-duration)',
  'ease-out',
  // Shown by Overlay state when controls or error need a scrim.
  'data-visible:opacity-100',
  // Error state adds dialog timing and blur.
  'data-error-visible:duration-(--media-error-dialog-transition-duration)',
  'data-error-visible:delay-(--media-error-dialog-transition-delay)',
  'data-error-visible:backdrop-blur-lg data-error-visible:backdrop-saturate-120'
);
