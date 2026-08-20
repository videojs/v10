import { cn } from '@videojs/utils/style';
import { reset } from './reset';

export const container = cn(
  reset,
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--container-border-radius)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-(length:--font-size-base) leading-normal subpixel-antialiased',
  '[--accent-color:var(--media-accent-color,var(--default-accent-color))]',
  '[--accent-contrast-color:contrast-color(var(--accent-color))]',
  '[--accent-background-color:var(--media-accent-color,oklch(from_var(--default-accent-color)_l_c_h/calc(alpha*0.1)))]',
  '[--accent-text-color:var(--media-accent-text-color,contrast-color(var(--media-accent-color,oklch(0_0_0))))]',
  '[--container-border-radius:var(--media-border-radius,0.75rem)]',
  // Focus ring
  'outline-2 outline-transparent -outline-offset-4',
  'transition-[outline-offset,outline-color] duration-100 ease-out',
  'focus-visible:outline-(--focus-ring-color) focus-visible:outline-offset-2',
  // Scrollbars
  'scrollbar-thin scrollbar-thumb-current/30',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-auto',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-thumb-current/80',
  // Shadow color variables (derived from currentColor lightness)
  '[--shadow-current-color:oklch(from_currentColor_0_0_0/clamp(0,calc((l-0.5)*0.5),0.15))]',
  '[--shadow-subtle-current-color:oklch(from_var(--shadow-current-color)_l_c_h/calc(alpha*0.4))]',
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
