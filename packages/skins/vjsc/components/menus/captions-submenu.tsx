import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/icons/vjsc';
import { type Props, Template, Text } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';
import { MenuChevron } from './menu-chevron';
import { RadioItem } from './radio-item';

export interface CaptionsSubmenuProps extends MenuProps {
  className?: Props<MenuProps>['className'];
}

export function CaptionsSubmenu({ className, ...props }: CaptionsSubmenuProps = {}) {
  return (
    <$.Menu.Root {...props}>
      <$.CaptionsRadioGroup.Root>
        <$.Menu.Trigger className={styles.triggerItem}>
          <CaptionsOffIcon className={styles.triggerItemIcon} />
          <Text token={captionsText.key}>{captionsText.text}</Text>
          <Text className={styles.hint}>
            <$.CaptionsRadioGroup.Value className={styles.hintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={[styles.content, className]}>
          <$.Menu.Item className={styles.backItem}>
            <MenuChevron back />
            <Text token={captionsText.key}>{captionsText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.separator} />
          <$.CaptionsRadioGroup.Options className={styles.radioGroup}>
            <Template name="captions-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.CaptionsRadioGroup.Options>
        </$.Menu.Content>
      </$.CaptionsRadioGroup.Root>
    </$.Menu.Root>
  );
}
import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
