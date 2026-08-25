import { cn } from '@videojs/utils/style';

const hideAtSmall = '@max-lg/media-root:hidden';

export const button = {
  base: cn(
    'flex items-center justify-center shrink-0 border-none cursor-pointer select-none text-center touch-manipulation min-h-0 h-[--spacing(9.5)]',
    'py-2 px-4 rounded-[--spacing(2)]',
    'outline-2 outline-transparent -outline-offset-2',
    'transition-[background-color,outline-offset,scale] will-change-[scale] duration-150 ease-out',
    'focus-visible:outline-(--media-focus-ring-color) focus-visible:outline-offset-2',
    'not-aria-disabled:active:scale-[0.97]',
    'motion-reduce:scale-100 motion-reduce:transition-[background-color] motion-reduce:will-change-auto',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    'supports-[corner-shape:squircle]:rounded-[--spacing(4)]',
    'supports-[corner-shape:squircle]:[corner-shape:squircle]'
  ),
  primary: 'bg-(--media-internal-accent-color) text-(--media-accent-contrast-color) font-medium text-shadow-none',
  subtle: cn(
    'bg-transparent text-inherit text-shadow-inherit',
    'not-aria-disabled:hover:bg-(--media-accent-background-color) not-aria-disabled:hover:text-(--media-internal-accent-text-color) not-aria-disabled:hover:no-underline',
    'not-aria-disabled:focus-visible:bg-(--media-accent-background-color) not-aria-disabled:focus-visible:text-(--media-internal-accent-text-color)',
    'not-aria-disabled:aria-expanded:bg-(--media-accent-background-color) not-aria-disabled:aria-expanded:text-(--media-internal-accent-text-color)'
  ),
  icon: cn('grid aspect-square p-0!', 'not-aria-disabled:active:scale-[0.97]'),
  seek: hideAtSmall,
  cast: hideAtSmall,
  airplay: hideAtSmall,
  pip: hideAtSmall,
  fullscreen: hideAtSmall,
  /**
   * Live variant: wide pill button with a status dot rendered via `::before` (gray → red at the live edge) and "LIVE"
   * as the button's own text.
   */
  live: cn(
    'inline-flex items-center gap-1.5',
    'aspect-auto w-auto px-3 py-2',
    'text-(length:--media-font-size-small) font-semibold uppercase tracking-wider leading-none',
    'before:inline-block before:size-2 before:shrink-0 before:rounded-full',
    'before:bg-current/40 before:transition-colors before:duration-150 before:ease-out',
    'data-[live-edge]:before:bg-red-500'
  ),
};
