import type { MenuProps } from '@videojs/core';
import { speedText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { type ClassNameValue, Template, Text } from 'vjsc/components';

import { ButtonTooltip } from '../../components/buttons/button-tooltip';
import { PlaybackRateButton } from '../../components/buttons/playback-rate-button';
import { RadioItem } from '../../components/menus/radio-item';
import styles from '../../styles/menus/menu.styles';
import audioSettingsMenuStyles from './settings-menu.styles';

export interface AudioSettingsMenuProps extends MenuProps {
  className?: ClassNameValue;
}

export function AudioSettingsMenu({ className, ...props }: AudioSettingsMenuProps = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <$.PlaybackRateRadioGroup.Root>
        <ButtonTooltip label={<Text token={speedText.key}>{speedText.text}</Text>} side="top">
          <$.Menu.Trigger $render={PlaybackRateButton} />
        </ButtonTooltip>
        <$.Menu.Popup className={[styles.popup, audioSettingsMenuStyles.popup, className]}>
          <$.Menu.Content className={styles.content}>
            <$.PlaybackRateRadioGroup.Options className={styles.radioGroup}>
              <Template name="playback-rate-option">
                <RadioItem>
                  <Template.Part name="label" />
                </RadioItem>
              </Template>
            </$.PlaybackRateRadioGroup.Options>
          </$.Menu.Content>
        </$.Menu.Popup>
      </$.PlaybackRateRadioGroup.Root>
    </$.Menu.Root>
  );
}
