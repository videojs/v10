import { cn } from '@videojs/utils/style';

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/50 via-black/30 to-transparent',
  'backdrop-blur-none backdrop-saturate-150',
  // Transitions (fine pointer only)
  '[@media(pointer:fine)]:transition-[opacity,backdrop-filter]',
  '[@media(pointer:fine)]:ease-out',
  '[@media(pointer:fine)]:duration-300 [@media(pointer:fine)]:delay-500',
  // Shown when controls visible
  'peer-data-visible/controls:opacity-100',
  '[@media(pointer:fine)]:peer-data-visible/controls:duration-150',
  '[@media(pointer:fine)]:peer-data-visible/controls:delay-0',
  // Shown when error visible (+ blur)
  'peer-data-open/error:opacity-100',
  '[@media(pointer:fine)]:peer-data-open/error:duration-150',
  '[@media(pointer:fine)]:peer-data-open/error:delay-0',
  'peer-data-open/error:backdrop-blur-lg',
  // Reduced motion
  '[@media(pointer:fine)]:motion-reduce:duration-100'
);
