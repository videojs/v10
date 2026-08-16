import { Menu } from '@videojs/core/components';
import type { FunctionComponent } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { MenuChevron } from './menu-chevron';

declare const SubmenuHint: FunctionComponent;

export interface SubmenuProps {
  children?: unknown;
  icon: unknown;
  label: unknown;
  selectedLabel: unknown;
}

export function Submenu({ children, icon, label, selectedLabel }: SubmenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className={[styles.menuItem, styles.item]}>
        {icon}
        {label}
        <SubmenuHint className={styles.hint}>
          {selectedLabel}
          <MenuChevron />
        </SubmenuHint>
      </Menu.Trigger>
      <Menu.Content className={styles.submenuPanel}>
        <Menu.Item className={[styles.menuItem, styles.back]}>
          <MenuChevron flipped />
          {label}
        </Menu.Item>
        <Menu.Separator className={styles.separator} />
        {children}
      </Menu.Content>
    </Menu.Root>
  );
}
