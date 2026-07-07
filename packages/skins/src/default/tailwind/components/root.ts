import { cn } from '@videojs/utils/style';
import { reset } from './reset';

export const root = cn(
  reset,
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,1.75rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-(length:--font-size-base) leading-normal subpixel-antialiased',
  // Focus ring
  'outline-2 outline-transparent -outline-offset-4',
  'transition-[outline-offset,outline-color] duration-100 ease-out',
  'focus-visible:outline-current focus-visible:outline-offset-2',
  // Scrollbars
  'scrollbar-thin scrollbar-thumb-current/30',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-auto',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-thumb-current/80',
  // Shadow color variables (derived from currentColor lightness)
  '[--media-current-shadow-color:oklch(from_currentColor_0_0_0/clamp(0,calc((l-0.5)*0.5),0.15))]',
  '[--media-current-shadow-color-subtle:oklch(from_var(--media-current-shadow-color)_l_c_h/calc(alpha*0.4))]',
  // Font and icon sizing
  '[--scale:1]',
  '[--font-size-base:calc(0.8125rem*var(--scale))]',
  '[--font-size-small:calc(0.6875rem*var(--scale))]',
  '[--font-size-medium:calc(0.9375rem*var(--scale))]',
  '[--font-size-tiny:calc(0.5625rem*var(--scale))]',
  '[--media-icon-size:calc(--spacing(4.5)*var(--scale))]',
  // Preserve the container's Tailwind spacing value and scale descendants from it.
  '[--spacing-proxy:var(--spacing)]',
  '[&>*]:[--spacing:calc(var(--spacing-proxy)*var(--scale))]'
);
