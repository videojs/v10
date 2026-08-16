import { ChevronIcon } from '@videojs/react/icons';
import { cn } from '@/components/videojs/utils';
import type { ComponentProps } from 'react';

export interface MenuChevronProps extends Omit<ComponentProps<'svg'>, 'children'> {
  flipped?: boolean;
}

export function MenuChevron({ flipped = false, className, ...props }: MenuChevronProps = {}) {
  return (
    <ChevronIcon
      {...props}
      className={cn(
        [
          'size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100 size-3.5',
          flipped && 'rotate-180',
        ],
        className,
      )}
    />
  );
}
