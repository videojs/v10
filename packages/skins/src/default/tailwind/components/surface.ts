import { cn } from '@videojs/utils/style';

export const surface = cn(
  // Border and shadow
  'ring shadow-sm',
  // Border to enhance contrast on lighter videos
  'after:absolute after:inset-0 after:ring after:ring-inset after:rounded-[inherit] after:pointer-events-none after:z-10'
);
