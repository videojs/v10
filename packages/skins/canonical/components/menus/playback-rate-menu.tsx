import { Template, Text } from '@videojs/compiler/components';
import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function PlaybackRateMenu() {
  return (
    <Submenu
      icon={<SpeedIcon className={styles.icon} />}
      label={<Text>{speedText}</Text>}
      selectedLabel={
        <Template.Part name="selected-label">
          <Text className={styles.hintLabel} />
        </Template.Part>
      }
    >
      <PlaybackRateRadioGroup>
        <Template name="playback-rate-option">
          <RadioItem>
            <Template.Part name="label">
              <Text />
            </Template.Part>
          </RadioItem>
        </Template>
      </PlaybackRateRadioGroup>
    </Submenu>
  );
}
