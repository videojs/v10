import { cn } from '@videojs/utils/style';

export const controls = cn(
  // Peer marker for overlay/captions
  'peer/controls',
  // Layout
  '@container/media-controls',
  'flex items-center',
  // Appearance (driven by CSS variables set on the root)
  'bg-(--media-controls-background-color)',
  '[backdrop-filter:var(--media-controls-backdrop-filter)]',
  // Text shadow
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)'
);
