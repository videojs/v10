import { Menu } from '@/ui/menu';
import type { ReactNode } from 'react';
import { MenuChevron } from './menu-chevron';

export interface SubmenuProps {
  children?: ReactNode;
  icon: ReactNode;
  label: ReactNode;
  selectedLabel: ReactNode;
}

export function Submenu({ children, icon, label, selectedLabel }: SubmenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className="media-item-base media-item">
        {icon}
        {label}
        <span className="media-hint">
          {selectedLabel}
          <MenuChevron />
        </span>
      </Menu.Trigger>
      <Menu.Content className="media-submenu-panel">
        <Menu.Item className="media-item-base media-back">
          <MenuChevron flipped />
          {label}
        </Menu.Item>
        <Menu.Separator className="media-separator" />
        {children}
      </Menu.Content>
    </Menu.Root>
  );
}
