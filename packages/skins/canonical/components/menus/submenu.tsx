import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/components';
import { type ComponentNode, type PropsWithChildren, Text } from 'vjsc/components';
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
    icon: ComponentNode;
    label: ComponentNode;
    selectedLabel: ComponentNode;
  }
>) {
  return (
    <$.Menu.Root {...props}>
      <$.Menu.Trigger className={[styles.item, styles.option]}>
        {icon}
        {label}
        <Text className={styles.hint}>
          {selectedLabel}
          <MenuChevron />
        </Text>
      </$.Menu.Trigger>
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
