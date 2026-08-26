import type { CaptionsButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/captions-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CaptionsButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.CaptionsButton className={[buttonStyles.root, styles.root, className]} {...props}>
        <CaptionsOffIcon className={[buttonStyles.icon, styles.offIcon]} />
        <CaptionsOnIcon className={[buttonStyles.icon, styles.onIcon]} />
      </$.CaptionsButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'captions-button',
  type: 'component',
  title: 'Captions Button',
  description: 'A state-aware button that toggles captions and subtitles.',
} as const satisfies SkinComponentMeta;
