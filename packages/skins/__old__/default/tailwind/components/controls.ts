import { cn } from '@videojs/utils/style';

export const controls = cn(
  // Peer marker for overlay/captions
  'peer/controls',
  // Layout
  '@container/media-controls',
  'p-[0.375rem] flex items-center gap-x-[0.075rem]',
  'rounded-3xl',
  // Text shadow
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)'
);
