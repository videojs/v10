import type { MenuProps } from '@videojs/core';
import { settingsText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { GearIcon } from '@videojs/icons/vjsc';
import { type PropsWithChildren, Text } from 'vjsc/components';

import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import tooltipStyles from '../../styles/popups/tooltip.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';

export function SettingsMenu({ children, className, ...props }: PropsWithChildren<MenuProps>) {
  return (
    <$.Menu.Root side="top" align="center" {...props}>
      <$.Tooltip.Root side="top">
        <$.Tooltip.Trigger>
          <$.Menu.Trigger className={[buttonStyles.root, styles.settingsTrigger]}>
            <GearIcon className={[buttonStyles.icon, styles.settingsTriggerIcon]} />
            <Text className={styles.triggerLabel} token={settingsText.key}>
              {settingsText.text}
            </Text>
          </$.Menu.Trigger>
        </$.Tooltip.Trigger>
        <$.Tooltip.Popup
          className={[popupStyles.root, popupStyles.transition, surfaceStyles.root, tooltipStyles.popup]}
        >
          <Text token={settingsText.key}>{settingsText.text}</Text>
        </$.Tooltip.Popup>
      </$.Tooltip.Root>
      <$.Menu.Popup className={[popupStyles.root, popupStyles.safeArea, surfaceStyles.root, styles.popup, className]}>
        <$.Menu.Content className={styles.content}>{children}</$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}
