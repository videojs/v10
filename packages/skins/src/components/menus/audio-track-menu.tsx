import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/icons/vjsc';
import { type Props, Template, Text } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/menus/menu.styles';
import { MenuChevron } from './menu-chevron';
import { RadioItem } from './radio-item';

export function AudioTrackMenu({ ...props }: Props<MenuProps> = {}) {
  return (
    <$.Menu.Root {...props}>
      <$.AudioTrackRadioGroup.Root>
        <$.Menu.Trigger className={styles.triggerItem}>
          <SpeechIcon className={styles.triggerItemIcon} />
          <Text token={audioText.key}>{audioText.text}</Text>
          <Text className={styles.hint}>
            <$.AudioTrackRadioGroup.Value className={styles.hintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.content}>
          <$.Menu.Item className={styles.backItem}>
            <MenuChevron back />
            <Text token={audioText.key}>{audioText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.separator} />
          <$.AudioTrackRadioGroup.Options className={styles.radioGroup}>
            <Template name="audio-track-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.AudioTrackRadioGroup.Options>
        </$.Menu.Content>
      </$.AudioTrackRadioGroup.Root>
    </$.Menu.Root>
  );
}
import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';

export const meta = {
  title: 'Audio Track Menu',
  description: 'A submenu for selecting an available audio track.',
} as const satisfies SkinComponentDescription;
