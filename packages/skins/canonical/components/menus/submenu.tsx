import type { FunctionComponent } from '@videojs/compiler/components';
import * as $ from '@videojs/core/components';
import styles from '../../styles/components/menu.styles';
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
    <$.Menu.Root>
      <$.Menu.Trigger className={[styles.item, styles.option]}>
        {icon}
        {label}
        <SubmenuHint className={styles.hint}>
          {selectedLabel}
          <MenuChevron />
        </SubmenuHint>
      </$.Menu.Trigger>
      <$.Menu.Content className={styles.submenu}>
        <$.Menu.Item className={[styles.item, styles.back]}>
          <MenuChevron flipped />
          {label}
        </$.Menu.Item>
        <$.Menu.Separator className={styles.separator} />
        {children}
      </$.Menu.Content>
    </$.Menu.Root>
  );
}
