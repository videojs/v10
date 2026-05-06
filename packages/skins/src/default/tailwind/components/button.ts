import { cn } from '@videojs/utils/style';

export const button = {
  base: cn(
    'flex items-center justify-center shrink-0 border-none cursor-pointer select-none text-center touch-manipulation min-h-0',
    'py-2 px-4 rounded-full',
    'outline-2 outline-transparent -outline-offset-2',
    'transition-[background-color,outline-offset,scale] will-change-[scale] duration-150 ease-out',
    'active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    'data-[availability=unavailable]:hidden',
    'data-[availability=unsupported]:hidden'
  ),
  primary: 'bg-white text-black font-medium text-shadow-none',
  subtle: cn(
    'bg-transparent text-inherit text-shadow-inherit',
    'hover:bg-current/10 hover:no-underline',
    'focus-visible:bg-current/10',
    'aria-expanded:bg-current/10'
  ),
  icon: cn('grid w-9 aspect-square p-0', 'active:scale-90'),
  /**
   * Live variant: wide pill button with a status dot rendered via `::before`
   * (gray → red at the live edge) and "LIVE" as the button's own text.
   */
  live: cn(
    'inline-flex items-center gap-1.5',
    'aspect-auto w-auto px-3 py-2',
    'text-xs font-semibold uppercase tracking-wider leading-none',
    'before:inline-block before:size-2 before:shrink-0 before:rounded-full',
    'before:bg-current/40 before:transition-colors before:duration-150 before:ease-out',
    'before:content-[""]',
    'data-[live-edge]:before:bg-red-500'
  ),
};
