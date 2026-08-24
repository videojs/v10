import type { MenuProps } from '@videojs/core';
import { settingsText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { GearIcon } from '@videojs/icons/vjsc';
import { type PropsWithChildren, Text } from 'vjsc/components';

import styles from '../../styles/components/menu.styles';
import tooltipStyles from '../../styles/components/tooltip.styles';

export function SettingsMenu({ children, className, ...props }: PropsWithChildren<MenuProps>) {
  return (
    <$.Menu.Root side="top" align="center" {...props}>
      <$.Tooltip.Root side="top">
        <$.Tooltip.Trigger>
          <$.Menu.Trigger className={styles.settingsTrigger}>
            <GearIcon className={styles.settingsIcon} />
            <Text className={styles.triggerLabel} token={settingsText.key}>
              {settingsText.text}
            </Text>
          </$.Menu.Trigger>
        </$.Tooltip.Trigger>
        <$.Tooltip.Popup className={tooltipStyles.popup}>
          <Text token={settingsText.key}>{settingsText.text}</Text>
        </$.Tooltip.Popup>
      </$.Tooltip.Root>
      <$.Menu.Popup className={[styles.popup, className]}>
        <$.Menu.Content className={styles.content}>{children}</$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}
