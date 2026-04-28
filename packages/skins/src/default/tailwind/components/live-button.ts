import { cn } from '@videojs/utils/style';

/**
 * Live button: wide pill button with a status dot rendered via `::before`
 * (gray → red at the live edge) and "LIVE" as the button's own text.
 */
export const liveButton = {
  button: cn(
    'inline-flex items-center gap-1.5',
    'aspect-auto w-auto px-3 py-2',
    'text-xs font-semibold uppercase tracking-wider leading-none',
    'before:inline-block before:size-2 before:shrink-0 before:rounded-full',
    'before:bg-current/40 before:transition-colors before:duration-150 before:ease-out',
    'before:content-[""]',
    'data-[live-edge]:before:bg-red-500'
  ),
};
