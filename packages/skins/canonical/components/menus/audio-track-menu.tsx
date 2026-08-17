import { Template, Text } from '@videojs/compiler/components';
import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function AudioTrackMenu() {
  return (
    <Submenu
      icon={<SpeechIcon className={styles.icon} />}
      label={<Text>{audioText}</Text>}
      selectedLabel={
        <Template.Part name="selected-label">
          <Text className={styles.hintLabel} />
        </Template.Part>
      }
    >
      <AudioTrackRadioGroup>
        <Template name="audio-track-option">
          <RadioItem>
            <Template.Part name="label">
              <Text />
            </Template.Part>
          </RadioItem>
        </Template>
      </AudioTrackRadioGroup>
    </Submenu>
  );
}
