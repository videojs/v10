import type { MenuProps } from '@videojs/core';
import { speedText } from '@videojs/core/i18n/text/menu';
import { SpeedIcon } from '@videojs/icons/components';
import { type Props, Template, Text } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';
import { Submenu } from './submenu';

export function PlaybackRateMenu(props: Props<MenuProps> = {}) {
  return (
    <Submenu
      icon={<SpeedIcon className={styles.icon} />}
      label={<Text token={speedText.key}>{speedText.text}</Text>}
      selectedLabel={<Text data-part="hint" className={styles.hintLabel} />}
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
