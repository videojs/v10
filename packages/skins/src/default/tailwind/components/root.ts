import { cn } from '@videojs/utils/style';

export const root = cn(
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,2rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] leading-normal subpixel-antialiased',
  '[&>*]:text-xs @3xl/media-root:[&>*]:text-sm',
  // Resets
  '**:box-border',
  '[&_button]:font-[inherit]',
  // Keep authored templates hidden even when component classes set `display`.
  '[&_[hidden][hidden]]:hidden',
  'motion-safe:[interpolate-size:allow-keywords]'
);
