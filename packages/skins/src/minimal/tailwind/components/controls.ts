import { cn } from '@videojs/utils/style';

export const controls = cn(
  'media-controls',
  // Layout
  '@container/media-controls',
  '[--media-popover-side-offset:calc(var(--media-spacing)*(var(--media-base-side-offset,0)+var(--media-controls-padding,1)))]',
  '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
  '[--media-popover-boundary-offset:calc(var(--media-spacing)*(var(--media-base-boundary-offset,0)+var(--media-controls-padding,1)))]',
  '[--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
  '[padding:calc(var(--media-spacing)*var(--media-controls-padding,1))] flex items-center [&:dir(rtl)]:flex-row-reverse',
  // Appearance (driven by CSS variables set on the root)
  'bg-(--media-controls-background-color)',
  '[backdrop-filter:var(--media-controls-backdrop-filter)]',
  // Text shadow
  'text-shadow-2xs text-shadow-(color:--media-shadow-current-color)'
);
