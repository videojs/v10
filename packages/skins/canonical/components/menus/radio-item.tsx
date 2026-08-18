import type { MenuItemProps } from '@videojs/core';
import * as $ from '@videojs/core/components';
import { CheckIcon } from '@videojs/icons/components';
import type { PropsWithChildren } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';

export function RadioItem({
  checked,
  children,
  className,
  ...props
}: PropsWithChildren<MenuItemProps & { checked?: boolean | undefined }>) {
  return (
    <$.Menu.RadioItem className={[styles.item, styles.option, className]} {...props}>
      {children}
      <$.Menu.ItemIndicator checked={checked === true} forceMount className={styles.indicator}>
        <CheckIcon className={styles.icon} />
      </$.Menu.ItemIndicator>
    </$.Menu.RadioItem>
  );
}
