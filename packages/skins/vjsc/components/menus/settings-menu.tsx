import type { MenuProps } from '@videojs/core';
import { settingsText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { GearIcon } from '@videojs/icons/vjsc';
import { type PropsWithChildren, Text } from 'vjsc/components';

import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/menus/menu.styles';
import { Button } from '../buttons/button';
import { ButtonTooltip } from '../buttons/button-tooltip';

export function SettingsMenu({
  children,
  className,
  ...props
}: PropsWithChildren<MenuProps> & { className?: string | undefined }) {
  return (
    <$.Menu.Root side="top" align="center" {...props}>
      <ButtonTooltip label={<Text token={settingsText.key}>{settingsText.text}</Text>} side="top">
        <$.Menu.Trigger $render={Button} className={styles.settingsTrigger}>
          <GearIcon className={[buttonStyles.icon, styles.settingsTriggerIcon]} />
          <Text className={styles.triggerLabel} token={settingsText.key}>
            {settingsText.text}
          </Text>
        </$.Menu.Trigger>
      </ButtonTooltip>
      <$.Menu.Popup keepMounted className={[styles.popup, className]}>
        <$.Menu.Content className={styles.content}>{children}</$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}
