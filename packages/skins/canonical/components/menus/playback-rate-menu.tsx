import { type FunctionComponent, Template, Text } from '@videojs/compiler/components';
import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

declare const SelectedLabel: FunctionComponent;

export function PlaybackRateMenu() {
  return (
    <Submenu
      icon={<SpeedIcon className={styles.icon} />}
      label={<Text token={speedText.key}>{speedText.text}</Text>}
      selectedLabel={<SelectedLabel className={styles.hintLabel} />}
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
