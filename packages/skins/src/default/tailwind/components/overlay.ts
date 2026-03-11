import { cn } from '@videojs/utils/style';

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/50 via-black/30 to-transparent',
  'backdrop-blur-none backdrop-saturate-120 backdrop-brightness-90',
  // Transitions
  'transition-[opacity,backdrop-filter] ease-out',
  'duration-300 delay-500',
  // Shown when controls visible
  'peer-data-visible/controls:opacity-100',
  'peer-data-visible/controls:duration-150',
  'peer-data-visible/controls:delay-0',
  // Shown when error visible (+ blur)
  'peer-data-open/error:opacity-100',
  'peer-data-open/error:duration-150',
  'peer-data-open/error:delay-0',
  'peer-data-open/error:backdrop-blur',
  // Reduced motion
  'motion-reduce:duration-100'
);
