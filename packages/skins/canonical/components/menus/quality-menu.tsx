import type { MenuProps } from '@videojs/core';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/icons/components';
import { type Props, Template, Text } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function QualityMenu(props: Props<MenuProps> = {}) {
  return (
    <Submenu
      icon={<SwitchesIcon className={styles.icon} />}
      label={<Text token={qualityText.key}>{qualityText.text}</Text>}
      selectedLabel={<Text data-part="hint" className={styles.hintLabel} />}
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
