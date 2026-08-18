import { type FunctionComponent, Template, Text } from '@videojs/compiler/components';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

declare const SelectedLabel: FunctionComponent;

export function CaptionsMenu() {
  return (
    <Submenu
      icon={<CaptionsOffIcon className={styles.icon} />}
      label={<Text token={captionsText.key}>{captionsText.text}</Text>}
      selectedLabel={<SelectedLabel className={styles.hintLabel} />}
    >
      <CaptionsRadioGroup>
        <Template name="captions-option">
          <RadioItem>
            <Template.Part name="label" />
          </RadioItem>
        </Template>
      </CaptionsRadioGroup>
    </Submenu>
  );
}
