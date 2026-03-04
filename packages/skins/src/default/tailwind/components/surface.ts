import { cn } from '@videojs/utils/style';

export const surface = cn(
  'bg-white/10',
  'backdrop-blur-3xl backdrop-brightness-90 backdrop-saturate-150',
  // Border and shadow
  'ring ring-white/5 ring-inset shadow-sm shadow-black/15',
  // Border to enhance contrast on lighter videos
  'after:absolute after:inset-0 after:ring after:rounded-[inherit] after:ring-black/15 after:pointer-events-none after:z-10',
  // Reduced transparency for users with preference
  '[@media(prefers-reduced-transparency:reduce)]:bg-black/70 [@media(prefers-reduced-transparency:reduce)]:ring-black [@media(prefers-reduced-transparency:reduce)]:after:ring-white/20',
  // High contrast mode
  'contrast-more:bg-black/90 contrast-more:ring-black contrast-more:after:ring-white/20'
);
