import type { MenuProps } from '@videojs/core';
import { speedText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { type Props, type PropsOf, Template, Text } from 'vjsc/components';

import { ButtonTooltip } from '../../components/buttons/button-tooltip';
import { PlaybackRateButton } from '../../components/buttons/playback-rate-button';
import { RadioItem } from '../../components/menus/radio-item';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import audioSettingsMenuStyles from './settings-menu.styles';

export function AudioSettingsMenu({
  className,
  ...props
}: Props<MenuProps & { className?: PropsOf<typeof $.Menu.Trigger>['className'] }> = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <$.PlaybackRateRadioGroup.Root>
        <ButtonTooltip label={<Text token={speedText.key}>{speedText.text}</Text>} side="top">
          <$.Menu.Trigger $render={PlaybackRateButton} className={className} />
        </ButtonTooltip>
        <$.Menu.Popup className={[popupStyles.popup, popupStyles.surface, styles.popup, audioSettingsMenuStyles.popup]}>
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
