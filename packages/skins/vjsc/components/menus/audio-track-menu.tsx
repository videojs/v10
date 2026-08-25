import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/icons/vjsc';
import { type PropsOf, Template, Text } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export interface AudioTrackMenuProps extends Omit<
  PropsOf<typeof Submenu>,
  'children' | 'icon' | 'label' | 'selectedLabel'
> {}

export function AudioTrackMenu(props: AudioTrackMenuProps = {}) {
  return (
    <Submenu
      icon={<SpeechIcon className={styles.triggerItemIcon} />}
      label={<Text token={audioText.key}>{audioText.text}</Text>}
      selectedLabel={<Text className={styles.hintLabel} data-part="hint" />}
      {...props}
    >
      <AudioTrackRadioGroup>
        <Template name="audio-track-option">
          <RadioItem>
            <Template.Part name="label" />
          </RadioItem>
        </Template>
      </AudioTrackRadioGroup>
    </Submenu>
  );
}
