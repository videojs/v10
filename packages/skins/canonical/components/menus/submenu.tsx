import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { type PropsWithChildren, Text, type VjscNode } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';
import { MenuChevron } from './menu-chevron';

export function Submenu({
  children,
  icon,
  label,
  selectedLabel,
  className,
  ...props
}: PropsWithChildren<
  MenuProps & {
    icon: VjscNode;
    label: VjscNode;
    selectedLabel: VjscNode;
  }
>) {
  return (
    <$.Menu.Root {...props}>
      <$.Menu.SubmenuTrigger className={[styles.item, styles.option]}>
        {icon}
        {label}
        <Text className={styles.hint}>
          {selectedLabel}
          <MenuChevron />
        </Text>
      </$.Menu.SubmenuTrigger>
      <$.Menu.Content className={[styles.submenu, className]}>
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
