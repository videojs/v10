import { Text } from '@videojs/core/components';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/icons/components';
import { Template } from '@videojs/jsx';
import styles from '../../styles/components/menu.styles';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function CaptionsMenu() {
  return (
    <Submenu
      icon={<CaptionsOffIcon className={styles.icon} />}
      label={<Text>{captionsText}</Text>}
      selectedLabel={
        <Template.Part name="selected-label">
          <Text className={styles.hintLabel} />
        </Template.Part>
      }
    >
      <CaptionsRadioGroup>
        <Template name="captions-option">
          <RadioItem>
            <Template.Part name="label">
              <Text />
            </Template.Part>
          </RadioItem>
        </Template>
      </CaptionsRadioGroup>
    </Submenu>
  );
}
