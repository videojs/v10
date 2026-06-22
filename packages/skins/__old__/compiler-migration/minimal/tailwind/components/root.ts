import { cn } from '@videojs/utils/style';

export const root = cn(
  // Layout & containment
  'block relative isolate @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,0.75rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] leading-normal subpixel-antialiased',
  '[&>*]:text-xs @3xl/media-root:[&>*]:text-sm',
  // Resets
  '**:box-border',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]'
);
