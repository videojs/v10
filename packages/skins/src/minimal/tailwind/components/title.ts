import { cn } from '@videojs/utils/style';

export const title = cn(
  'absolute top-0 inset-x-0',
  'py-3 px-4',
  'pointer-events-none',
  'text-base font-medium',
  '[color:var(--media-color-primary,oklch(1_0_0))]',
  'truncate',
  'opacity-0',
  'transition-opacity',
  'duration-(--media-controls-transition-duration)',
  'ease-out',
  'peer-data-visible/controls:opacity-100',
  'peer-data-open/error:hidden',
  'not-data-has-title:hidden'
);
