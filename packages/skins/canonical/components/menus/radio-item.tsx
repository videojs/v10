import { Menu } from '@videojs/core/components';
import { CheckIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.tailwind';

export interface RadioItemProps {
  children?: unknown;
}

export function RadioItem({ children }: RadioItemProps) {
  return (
    <Menu.RadioItem className={[styles.itemBase, styles.item]}>
      {children}
      <Menu.ItemIndicator forceMount className={styles.indicator}>
        <CheckIcon className={styles.icon} />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}
