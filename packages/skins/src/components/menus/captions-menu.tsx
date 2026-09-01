import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/vjsc';
import { type ClassNameValue, type Props, Template } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import captionsButtonStyles from '../../styles/buttons/captions-button.styles';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import { Button } from '../buttons/button';
import { ButtonTooltip } from '../buttons/button-tooltip';
import { RadioItem } from './radio-item';

export interface CaptionsMenuProps extends MenuProps {
  className?: ClassNameValue;
}

export function CaptionsMenu({ className, ...props }: Props<CaptionsMenuProps> = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <$.CaptionsRadioGroup.Root>
        <ButtonTooltip side="top">
          <$.Menu.Trigger
            $render={Button}
            aria-label="Enable captions"
            className={[captionsButtonStyles.root, className]}
          >
            <CaptionsOffIcon className={[buttonStyles.icon, captionsButtonStyles.offIcon]} />
            <CaptionsOnIcon className={[buttonStyles.icon, captionsButtonStyles.onIcon]} />
          </$.Menu.Trigger>
        </ButtonTooltip>
        <$.Menu.Popup className={[popupStyles.popup, popupStyles.surface, styles.popup]}>
          <$.Menu.Content className={styles.content}>
            <$.CaptionsRadioGroup.Options className={styles.radioGroup}>
              <Template name="captions-option">
                <RadioItem>
                  <Template.Part name="label" />
                </RadioItem>
              </Template>
            </$.CaptionsRadioGroup.Options>
          </$.Menu.Content>
        </$.Menu.Popup>
      </$.CaptionsRadioGroup.Root>
    </$.Menu.Root>
  );
}

export const meta = {
  name: 'captions-menu',
  type: 'component',
  title: 'Captions Menu',
  description: 'A captions button and popup for selecting a text track.',
} as const satisfies SkinComponentMeta;
