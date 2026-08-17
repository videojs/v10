import { Text } from '@videojs/compiler/components';
import * as $ from '@videojs/core/components';
import { settingsText } from '@videojs/core/i18n/text/menu';
import { GearIcon } from '@videojs/icons/components';
import buttonStyles from '../../styles/components/button.styles';
import styles from '../../styles/components/menu.styles';
import popupStyles from '../../styles/components/popup.styles';

export interface SettingsMenuProps {
  children?: unknown;
}

export function SettingsMenu({ children }: SettingsMenuProps) {
  return (
    <$.Menu.Root side="top" align="center">
      <$.Tooltip.Root side="top">
        <$.Tooltip.Trigger>
          <$.Menu.Trigger className={[buttonStyles.root, styles.trigger]}>
            <GearIcon className={[buttonStyles.icon, styles.triggerIcon]} />
            <Text className={styles.srOnly}>{settingsText}</Text>
          </$.Menu.Trigger>
        </$.Tooltip.Trigger>
        <$.Tooltip.Popup className={[popupStyles.surface, popupStyles.tooltip]}>
          <Text>{settingsText}</Text>
        </$.Tooltip.Popup>
      </$.Tooltip.Root>
      <$.Menu.Content className={[popupStyles.surface, popupStyles.popover, styles.root, styles.group]}>
        <$.Menu.Group className={styles.group}>{children}</$.Menu.Group>
      </$.Menu.Content>
    </$.Menu.Root>
  );
}
