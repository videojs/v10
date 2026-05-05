import { cn } from '@videojs/utils/style';
import { reset } from './reset';

export const root = cn(
  reset,
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,2rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] leading-normal subpixel-antialiased',
  '*:text-xs @3xl/media-root:*:text-sm',
  // Focus ring
  'outline-2 outline-transparent -outline-offset-4',
  'transition-[outline-offset,outline-color] duration-100 ease-out',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  // Shadow color variables (derived from currentColor lightness)
  '[--media-current-shadow-color:oklch(from_currentColor_0_0_0/clamp(0,calc((l-0.5)*0.5),0.15))]',
  '[--media-current-shadow-color-subtle:oklch(from_var(--media-current-shadow-color)_l_c_h/calc(alpha*0.4))]',
  // Icon sizing
  '[--media-icon-size:18px]'
);
