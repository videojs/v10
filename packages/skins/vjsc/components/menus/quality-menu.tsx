import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/icons/vjsc';
import { type PropsOf, Template, Text } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export interface QualityMenuProps extends Omit<
  PropsOf<typeof Submenu>,
  'children' | 'icon' | 'label' | 'selectedLabel'
> {}

export function QualityMenu(props: QualityMenuProps = {}) {
  return (
    <Submenu
      icon={<SwitchesIcon className={styles.triggerItemIcon} />}
      label={<Text token={qualityText.key}>{qualityText.text}</Text>}
      selectedLabel={<Text className={styles.hintLabel} data-part="hint" />}
      {...props}
    >
      <QualityRadioGroup>
        <Template name="quality-option">
          <RadioItem>
            <Text>
              <Template.Part name="label" />
              <Template.Part name="tier" className={styles.tier} />
            </Text>
            <Template.Part name="badge" className={styles.badge} />
          </RadioItem>
        </Template>
      </QualityRadioGroup>
    </Submenu>
  );
}
