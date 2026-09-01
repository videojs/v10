import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/icons/vjsc';
import { type Props, Template, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/menus/menu.styles';
import { MenuChevron } from './menu-chevron';
import { RadioItem } from './radio-item';

export function PlaybackRateSubmenu({ ...props }: Props<MenuProps> = {}) {
  return (
    <$.Menu.Root {...props}>
      <$.PlaybackRateRadioGroup.Root>
        <$.Menu.Trigger className={styles.triggerItem}>
          <SpeedIcon className={styles.triggerItemIcon} />
          <Text token={speedText.key}>{speedText.text}</Text>
          <Text className={styles.hint}>
            <$.PlaybackRateRadioGroup.Value className={styles.hintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.content}>
          <$.Menu.Item className={styles.backItem}>
            <MenuChevron back />
            <Text token={speedText.key}>{speedText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.separator} />
          <$.PlaybackRateRadioGroup.Options className={styles.radioGroup}>
            <Template name="playback-rate-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.PlaybackRateRadioGroup.Options>
        </$.Menu.Content>
      </$.PlaybackRateRadioGroup.Root>
    </$.Menu.Root>
  );
}
import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';

export const meta = {
  name: 'playback-rate-submenu',
  type: 'component',
  title: 'Playback Rate Submenu',
  description: 'A submenu for selecting the playback speed.',
} as const satisfies SkinComponentMeta;
