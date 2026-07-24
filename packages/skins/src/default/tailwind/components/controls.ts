import { cn } from '@videojs/utils/style';

export const controls = cn(
  // Peer marker for overlay/captions
  'peer/controls',
  // Layout
  '@container/media-controls',
  '[--media-popover-side-offset:calc(var(--spacing)*(var(--base-side-offset,2)+var(--controls-padding,1)))]',
  '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
  '[--media-popover-boundary-offset:calc(var(--spacing)*var(--base-boundary-offset,2))]',
  '[--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
  '[padding:calc(var(--spacing)*var(--controls-padding,1))] flex items-center gap-x-px',
  'rounded-full',
  // Text shadow
  'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)'
);
