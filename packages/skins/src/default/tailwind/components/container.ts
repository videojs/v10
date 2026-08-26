import { cn } from '@videojs/utils/style';

import { reset } from './reset';

export const container = cn(
  reset,
  // Layout & containment
  'block relative isolate h-full w-full @container/media-root',
  // Appearance
  'rounded-(--media-container-border-radius,1.75rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-(length:--media-font-size-base) leading-normal subpixel-antialiased',
  '[--media-internal-accent-color:var(--media-accent-color,var(--media-default-accent-color))]',
  '[--media-accent-contrast-color:contrast-color(var(--media-internal-accent-color))]',
  '[--media-accent-background-color:var(--media-accent-color,oklch(from_var(--media-default-accent-color)_l_c_h/calc(alpha*0.1)))]',
  '[--media-internal-accent-text-color:var(--media-accent-text-color,contrast-color(var(--media-accent-color,oklch(0_0_0))))]',
  '[--media-container-border-radius:var(--media-border-radius,1.75rem)]',
  // Focus ring
  'outline-2 outline-transparent -outline-offset-4',
  'transition-[outline-offset,outline-color] duration-100 ease-out',
  'focus-visible:outline-(--media-focus-ring-color) focus-visible:outline-offset-2',
  // Scrollbars
  'scrollbar-thin scrollbar-thumb-current/30',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-auto',
  '[@media_(prefers-reduced-transparency:reduce)_or_(prefers-contrast:more)]:scrollbar-thumb-current/80',
  // Shadow color variables (derived from currentColor lightness)
  '[--media-shadow-current-color:oklch(from_currentColor_0_0_0/clamp(0,calc((l-0.5)*0.5),0.15))]',
  '[--media-shadow-subtle-current-color:oklch(from_var(--media-shadow-current-color)_l_c_h/calc(alpha*0.4))]',
  // Font and icon sizing
  '[--media-scale:1]',
  '[--media-font-size-base:calc(0.8125rem*var(--media-scale))]',
  '[--media-font-size-small:calc(0.6875rem*var(--media-scale))]',
  '[--media-font-size-medium:calc(0.9375rem*var(--media-scale))]',
  '[--media-font-size-tiny:calc(0.5625rem*var(--media-scale))]',
  '[--media-spacing:calc(var(--media-scale-unit,16px)*var(--media-scale)/4)]',
  '[--spacing:var(--media-spacing)]',
  '[--media-icon-size:calc(var(--media-spacing)*4.5)]'
);
