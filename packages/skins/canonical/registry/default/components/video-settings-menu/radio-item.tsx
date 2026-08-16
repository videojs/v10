import { Menu } from '@videojs/react';
import { CheckIcon } from '@videojs/react/icons';
import { cn, resolveClassName } from '@/components/videojs/utils';
import type { ReactNode } from 'react';

export interface RadioItemProps extends Menu.RadioItemProps {
  children?: ReactNode;
  checked: boolean;
}

export function RadioItem({ checked, children, className, ...props }: RadioItemProps) {
  return (
    <Menu.RadioItem
      {...props}
      className={(state) =>
        cn(
          'group/menu-item relative flex cursor-pointer select-none items-center gap-1.5 rounded-media-surface px-2 py-1.5 text-left',
          'outline-2 -outline-offset-2 outline-transparent',
          'hover:bg-media-control-hover hover:text-media-accent-text data-highlighted:bg-media-control-hover data-highlighted:text-media-accent-text',
          'focus-visible:outline-media-focus focus-visible:outline-offset-2',
          '[transition-property:color,background-color] [transition-duration:100ms] [transition-timing-function:ease-in-out]',
          'justify-between tabular-nums text-inherit',
          'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden',
          'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
          resolveClassName(className, state),
        )
      }
    >
      {children}
      <Menu.ItemIndicator
        forceMount
        className="ml-auto -mr-1 shrink-0 opacity-0 group-aria-checked/menu-item:opacity-100"
        checked={checked}
      >
        <CheckIcon className="size-media-icon shrink-0 opacity-70 drop-shadow-media-icon group-hover/menu-item:opacity-100" />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}
