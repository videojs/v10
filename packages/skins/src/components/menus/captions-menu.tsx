import type { MenuProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { type Props, type PropsOf, Template } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/menus/menu.styles';
import popupStyles from '../../styles/popups/popup.styles';
import { CaptionsButton } from '../buttons/captions-button';
import { RadioItem } from './radio-item';

export interface CaptionsMenuProps extends MenuProps {
  className?: PropsOf<typeof $.Menu.Trigger>['className'];
}

export function CaptionsMenu({ className, ...props }: Props<CaptionsMenuProps> = {}) {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport" {...props}>
      <$.CaptionsRadioGroup.Root>
        <$.Menu.Trigger $render={CaptionsButton} className={className} />
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
