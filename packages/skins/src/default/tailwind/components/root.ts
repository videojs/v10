import { cn } from '@videojs/utils/style';

export const root = cn(
  // Layout & containment
  'block relative isolate @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,2rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
  // Resets
  '**:box-border **:m-0',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]',
  // Fullscreen
  '[&:fullscreen]:rounded-none'
);
