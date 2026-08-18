import type { MenuProps } from '@videojs/core';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/icons/components';
import { type Props, Template, Text } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function CaptionsMenu(props: Props<MenuProps> = {}) {
  return (
    <Submenu
      icon={<CaptionsOffIcon className={styles.icon} />}
      label={<Text token={captionsText.key}>{captionsText.text}</Text>}
      selectedLabel={<Text data-part="hint" className={styles.hintLabel} />}
      {...props}
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
