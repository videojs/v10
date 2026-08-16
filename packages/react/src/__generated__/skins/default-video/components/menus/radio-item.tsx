import { Menu } from '@/ui/menu';
import { CheckIcon } from '@/icons';
import { cn } from '@videojs/utils/style';
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
        cn('media-item-base media-item', typeof className === 'function' ? className(state) : className)
      }
    >
      {children}
      <Menu.ItemIndicator forceMount className="media-indicator" checked={checked}>
        <CheckIcon className="media-icon" />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}
