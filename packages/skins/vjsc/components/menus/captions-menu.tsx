import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon } from '@videojs/icons/vjsc';
import { type PropsOf, Template, Text } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export interface CaptionsMenuProps extends Omit<
  PropsOf<typeof Submenu>,
  'children' | 'icon' | 'label' | 'selectedLabel'
> {}

export function CaptionsMenu(props: CaptionsMenuProps = {}) {
  return (
    <Submenu
      icon={<CaptionsOffIcon className={styles.triggerItemIcon} />}
      label={<Text token={captionsText.key}>{captionsText.text}</Text>}
      selectedLabel={<Text className={styles.hintLabel} data-part="hint" />}
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
