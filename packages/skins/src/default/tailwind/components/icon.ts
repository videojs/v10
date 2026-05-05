import { cn } from '@videojs/utils/style';

export const icon = cn(
  'block [grid-area:1/1] size-(--media-icon-size) shrink-0',
  'drop-shadow-[0_1px_0_var(--media-current-shadow-color)]',
  'transition-discrete transition-[display,opacity] duration-150 ease-out'
);

export const iconHidden = 'hidden opacity-0';
export const iconFlipped = '[scale:-1_1]';
export const iconContainer = 'relative';
