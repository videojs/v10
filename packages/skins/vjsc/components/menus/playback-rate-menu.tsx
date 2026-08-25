import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/icons/vjsc';
import { type PropsOf, Template, Text } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export interface PlaybackRateMenuProps extends Omit<
  PropsOf<typeof Submenu>,
  'children' | 'icon' | 'label' | 'selectedLabel'
> {}

export function PlaybackRateMenu(props: PlaybackRateMenuProps = {}) {
  return (
    <Submenu
      icon={<SpeedIcon className={styles.triggerItemIcon} />}
      label={<Text token={speedText.key}>{speedText.text}</Text>}
      selectedLabel={<Text className={styles.hintLabel} data-part="hint" />}
      {...props}
    >
      <PlaybackRateRadioGroup>
        <Template name="playback-rate-option">
          <RadioItem>
            <Template.Part name="label" />
          </RadioItem>
        </Template>
      </PlaybackRateRadioGroup>
    </Submenu>
  );
}
