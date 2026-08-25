import type { MenuProps } from '@videojs/core';
import { settingsText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { GearIcon } from '@videojs/icons/vjsc';
import { type PropsWithChildren, Text } from 'vjsc/components';

import buttonStyles from '../../styles/components/button.styles';
import styles from '../../styles/components/menu.styles';
import popupStyles from '../../styles/components/popup.styles';

export function SettingsMenu({ children, className, ...props }: PropsWithChildren<MenuProps>) {
  return (
    <$.Menu.Root side="top" align="center" {...props}>
      <$.Tooltip.Root side="top">
        <$.Tooltip.Trigger>
          <$.Menu.Trigger className={[buttonStyles.root, styles.trigger]}>
            <GearIcon className={[buttonStyles.icon, styles.triggerIcon]} />
            <Text className={styles.srOnly} token={settingsText.key}>
              {settingsText.text}
            </Text>
          </$.Menu.Trigger>
        </$.Tooltip.Trigger>
        <$.Tooltip.Popup className={[popupStyles.surface, popupStyles.tooltip]}>
          <Text token={settingsText.key}>{settingsText.text}</Text>
        </$.Tooltip.Popup>
      </$.Tooltip.Root>
      <$.Menu.Content className={[popupStyles.surface, popupStyles.popover, styles.root, styles.group, className]}>
        <$.Menu.Group className={styles.group}>{children}</$.Menu.Group>
      </$.Menu.Content>
    </$.Menu.Root>
  );
}
