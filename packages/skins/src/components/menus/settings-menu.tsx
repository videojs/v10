import type { MenuProps } from '@videojs/core';
import { settingsText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { GearIcon } from '@videojs/icons/vjsc';
import { type ClassNameValue, type PropsWithChildren, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import { Button } from '../buttons/button';
import { ButtonTooltip } from '../buttons/button-tooltip';

export interface SettingsMenuProps extends MenuProps {
  className?: ClassNameValue;
}

export function SettingsMenu({ children, className, ...props }: PropsWithChildren<SettingsMenuProps>) {
  return (
    <$.Menu.Root side="top" align="center" {...props}>
      <ButtonTooltip label={<Text token={settingsText.key}>{settingsText.text}</Text>} side="top">
        <$.Menu.Trigger $render={Button} className={[styles.settingsTrigger, className]}>
          <GearIcon className={[buttonStyles.icon, styles.settingsTriggerIcon]} />
          <Text className={styles.triggerLabel} token={settingsText.key}>
            {settingsText.text}
          </Text>
        </$.Menu.Trigger>
      </ButtonTooltip>
      <$.Menu.Popup keepMounted className={[popupStyles.popup, popupStyles.surface, styles.popup]}>
        <$.Menu.Content className={styles.content}>{children}</$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}

export const meta = {
  name: 'settings-menu',
  type: 'component',
  title: 'Settings Menu',
  description: 'A settings button and popup for composing playback option submenus.',
} as const satisfies SkinComponentMeta;
