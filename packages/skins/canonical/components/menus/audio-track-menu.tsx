import { type FunctionComponent, Template, Text } from '@videojs/compiler/components';
import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

declare const SelectedLabel: FunctionComponent;

export function AudioTrackMenu() {
  return (
    <Submenu
      icon={<SpeechIcon className={styles.icon} />}
      label={<Text token={audioText.key}>{audioText.text}</Text>}
      selectedLabel={<SelectedLabel className={styles.hintLabel} />}
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
