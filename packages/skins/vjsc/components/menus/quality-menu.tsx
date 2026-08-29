import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/icons/vjsc';
import { type ClassNameValue, Template, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/menus/menu.styles';
import { MenuChevron } from './menu-chevron';
import { RadioItem } from './radio-item';

export interface QualityMenuProps extends MenuProps {
  className?: ClassNameValue;
}

export function QualityMenu({ className, ...props }: QualityMenuProps = {}) {
  return (
    <$.Menu.Root {...props}>
      <$.QualityRadioGroup.Root>
        <$.Menu.Trigger className={styles.triggerItem}>
          <SwitchesIcon className={styles.triggerItemIcon} />
          <Text token={qualityText.key}>{qualityText.text}</Text>
          <Text className={styles.hint}>
            <$.QualityRadioGroup.Value className={styles.hintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={[styles.content, className]}>
          <$.Menu.Item className={styles.backItem}>
            <MenuChevron back />
            <Text token={qualityText.key}>{qualityText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.separator} />
          <$.QualityRadioGroup.Options className={styles.radioGroup}>
            <Template name="quality-option">
              <RadioItem>
                <Text>
                  <Template.Part name="label" />
                  <Template.Part name="tier" className={styles.tier} />
                </Text>
                <Template.Part name="badge" className={styles.badge} />
              </RadioItem>
            </Template>
          </$.QualityRadioGroup.Options>
        </$.Menu.Content>
      </$.QualityRadioGroup.Root>
    </$.Menu.Root>
  );
}
import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';

export const meta = {
  name: 'quality-menu',
  type: 'component',
  title: 'Quality Menu',
  description: 'A submenu for selecting the playback quality.',
} as const satisfies SkinComponentMeta;
