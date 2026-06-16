import { cn } from '@videojs/utils/style';

export const root = cn(
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,2rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] leading-normal subpixel-antialiased',
  '[&>*]:text-xs @3xl/media-root:[&>*]:text-sm',
  // Focus ring (matches vanilla `root.css:13-18`)
  'outline-2 outline-transparent outline-offset-2',
  'focus-visible:outline-current',
  // Resets
  '**:box-border',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]'
);
