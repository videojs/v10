import type { MenuItemProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CheckIcon } from '@videojs/icons/vjsc';
import type { PropsWithChildren } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';

export function RadioItem({ children, className, ...props }: PropsWithChildren<MenuItemProps>) {
  return (
    <$.Menu.RadioItem className={[styles.item, styles.option, className]} {...props}>
      {children}
      <$.Menu.ItemIndicator forceMount className={styles.indicator}>
        <CheckIcon className={styles.icon} />
      </$.Menu.ItemIndicator>
    </$.Menu.RadioItem>
  );
}
