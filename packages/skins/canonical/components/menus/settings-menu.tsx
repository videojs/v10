import { Menu, Text, Tooltip as TooltipPrimitive } from '@videojs/core/components';
import { settingsText } from '@videojs/core/i18n/text/menu';
import { GearIcon } from '@videojs/icons/components';
import buttonStyles from '../../styles/components/button.tailwind';
import styles from '../../styles/components/menu.tailwind';
import popupStyles from '../../styles/components/popup.tailwind';

export interface SettingsMenuProps {
  children?: unknown;
}

export function SettingsMenu({ children }: SettingsMenuProps) {
  return (
    <Menu.Root side="top" align="center">
      <TooltipPrimitive.Root side="top">
        <TooltipPrimitive.Trigger>
          <Menu.Trigger className={[buttonStyles.button, styles.settingsTrigger]}>
            <GearIcon className={[buttonStyles.buttonIcon, styles.settingsIcon]} />
            <Text className={styles.srOnly}>{settingsText}</Text>
          </Menu.Trigger>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Popup className={[popupStyles.surface, popupStyles.tooltip]}>
          <Text>{settingsText}</Text>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Root>
      <Menu.Content className={[popupStyles.surface, styles.settings]}>
        <Menu.Group className={styles.group}>{children}</Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}
