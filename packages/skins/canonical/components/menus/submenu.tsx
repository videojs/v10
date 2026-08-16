import { Menu } from '@videojs/core/components';
import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { MenuChevron } from './menu-chevron';

declare const HintPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export interface SubmenuProps {
  children?: unknown;
  icon: unknown;
  label: unknown;
  selectedLabel: unknown;
}

export function Submenu({ children, icon, label, selectedLabel }: SubmenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className={[styles.itemBase, styles.item]}>
        {icon}
        {label}
        <HintPrimitive className={styles.hint}>
          {selectedLabel}
          <MenuChevron />
        </HintPrimitive>
      </Menu.Trigger>
      <Menu.Content className={styles.submenuPanel}>
        <Menu.Item className={[styles.itemBase, styles.back]}>
          <MenuChevron flipped />
          {label}
        </Menu.Item>
        <Menu.Separator className={styles.separator} />
        {children}
      </Menu.Content>
    </Menu.Root>
  );
}
