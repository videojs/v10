import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/vjsc';
import { type Props, Template } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import captionsButtonStyles from '../../styles/buttons/captions-button.styles';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';
import { ButtonTooltip } from '../buttons/button-tooltip';
import { CaptionsRadioGroup } from './radio-group';
import { RadioItem } from './radio-item';

export function CaptionsMenu({ className, ...props }: Props<MenuProps> = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <ButtonTooltip side="top">
        <$.Menu.Trigger className={[buttonStyles.root, captionsButtonStyles.root]}>
          <CaptionsOffIcon className={[buttonStyles.icon, captionsButtonStyles.offIcon]} />
          <CaptionsOnIcon className={[buttonStyles.icon, captionsButtonStyles.onIcon]} />
        </$.Menu.Trigger>
      </ButtonTooltip>
      <$.Menu.Popup className={[popupStyles.root, popupStyles.safeArea, surfaceStyles.root, styles.popup, className]}>
        <$.Menu.Content className={styles.content}>
          <CaptionsRadioGroup>
            <Template name="captions-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </CaptionsRadioGroup>
        </$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}

export const meta = {
  name: 'captions-menu',
  type: 'component',
  title: 'Captions Menu',
  description: 'A captions button and popup for selecting a text track.',
} as const satisfies SkinComponentMeta;
