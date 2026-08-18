import type { MenuProps } from '@videojs/core';
import { audioText } from '@videojs/core/i18n/text/menu';
import { SpeechIcon } from '@videojs/icons/components';
import { type Props, Template, Text } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';
import { AudioTrackRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function AudioTrackMenu(props: Props<MenuProps> = {}) {
  return (
    <Submenu
      icon={<SpeechIcon className={styles.icon} />}
      label={<Text token={audioText.key}>{audioText.text}</Text>}
      selectedLabel={<Text data-part="hint" className={styles.hintLabel} />}
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
