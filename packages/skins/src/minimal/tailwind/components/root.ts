import { cn } from '@videojs/utils/style';

export const root = cn(
  // Layout & containment
  'block relative isolate @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,0.75rem)',
  '[--media-controls-radius:var(--media-border-radius,1rem)]',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
  // Resets
  '**:box-border',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]'
);
