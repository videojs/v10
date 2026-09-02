import type { MenuItemProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CheckIcon } from '@videojs/icons/vjsc';
import type { PropsWithChildren } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/menus/menu.styles';

export function RadioItem({ children, className, ...props }: PropsWithChildren<MenuItemProps>) {
  return (
    <$.Menu.RadioItem className={[styles.radioItem, className]} {...props}>
      {children}
      <$.Menu.ItemIndicator forceMount className={styles.itemIndicator}>
        <CheckIcon className={styles.radioItemIcon} />
      </$.Menu.ItemIndicator>
    </$.Menu.RadioItem>
  );
}

export const meta = {
  title: 'Radio Item',
  description: 'A selectable menu item with an active-state indicator.',
} as const satisfies SkinComponentDescription;
