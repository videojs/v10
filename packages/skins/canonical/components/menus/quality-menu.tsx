import { Text } from '@videojs/core/components';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { SwitchesIcon } from '@videojs/icons/components';
import { type ComponentNode, Template } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { QualityRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

declare const OptionLabelPrimitive: (props: { children?: unknown }) => ComponentNode;

export function QualityMenu() {
  return (
    <Submenu
      icon={<SwitchesIcon className={styles.icon} />}
      label={<Text>{qualityText}</Text>}
      selectedLabel={
        <Template.Part name="selected-label">
          <Text className={styles.hintLabel} />
        </Template.Part>
      }
    >
      <QualityRadioGroup>
        <Template name="quality-option">
          <RadioItem>
            <OptionLabelPrimitive>
              <Template.Part name="label">
                <Text />
              </Template.Part>
              <Template.Part name="tier">
                <Text className={styles.tier} />
              </Template.Part>
            </OptionLabelPrimitive>
            <Template.Part name="badge">
              <Text className={styles.badge} />
            </Template.Part>
          </RadioItem>
        </Template>
      </QualityRadioGroup>
    </Submenu>
  );
}
