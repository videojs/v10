import { cn } from '@videojs/utils/style';

export const controls = cn(
  // Peer marker for overlay/captions
  'peer/controls',
  // Layout
  '@container/media-controls',
  'flex items-center',
  // Shadow color variables (derived from currentColor lightness)
  '[--media-controls-current-shadow-color:oklch(from_currentColor_0_0_0/clamp(0,calc((l-0.5)*0.5),0.25))]',
  '[--media-controls-current-shadow-color-subtle:oklch(from_var(--media-controls-current-shadow-color)_l_c_h/calc(alpha*0.4))]',
  // Text shadow
  'text-shadow-[0_0_1px_var(--media-controls-current-shadow-color)]'
);
