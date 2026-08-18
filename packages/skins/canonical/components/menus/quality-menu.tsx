import { type FunctionComponent, Template, Text } from '@videojs/compiler/components';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

declare const QualityOptionLabel: FunctionComponent;
declare const SelectedLabel: FunctionComponent;

export function QualityMenu() {
  return (
    <Submenu
      icon={<SwitchesIcon className={styles.icon} />}
      label={<Text token={qualityText.key}>{qualityText.text}</Text>}
      selectedLabel={<SelectedLabel className={styles.hintLabel} />}
    >
      <QualityRadioGroup>
        <Template name="quality-option">
          <RadioItem>
            <QualityOptionLabel>
              <Template.Part name="label" />
              <Template.Part name="tier" className={styles.tier} />
            </QualityOptionLabel>
            <Template.Part name="badge" className={styles.badge} />
          </RadioItem>
        </Template>
      </QualityRadioGroup>
    </Submenu>
  );
}
