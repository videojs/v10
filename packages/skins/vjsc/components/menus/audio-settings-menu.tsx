import type { MenuProps } from '@videojs/core';
import { speedText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { SpeedIcon } from '@videojs/icons/vjsc';
import { type Props, Template, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';
import { ButtonTooltip } from '../buttons/button-tooltip';
import { PlaybackRateRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';

export interface AudioSettingsMenuProps extends MenuProps {
  className?: Props<MenuProps>['className'];
}

export function AudioSettingsMenu({ className, ...props }: AudioSettingsMenuProps = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <ButtonTooltip label={<Text token={speedText.key}>{speedText.text}</Text>} side="top">
        <$.Menu.Trigger className={buttonStyles.root}>
          <SpeedIcon className={buttonStyles.icon} />
          <Text className={styles.triggerLabel} token={speedText.key}>
            {speedText.text}
          </Text>
        </$.Menu.Trigger>
      </ButtonTooltip>
      <$.Menu.Popup className={[popupStyles.root, popupStyles.safeArea, surfaceStyles.root, styles.popup, className]}>
        <$.Menu.Content className={styles.content}>
          <PlaybackRateRadioGroup>
            <Template name="playback-rate-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </PlaybackRateRadioGroup>
        </$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}

export const meta = {
  name: 'audio-settings-menu',
  type: 'component',
  title: 'Audio Settings Menu',
  description: 'A standalone audio settings menu for selecting playback speed.',
} as const satisfies SkinComponentMeta;
