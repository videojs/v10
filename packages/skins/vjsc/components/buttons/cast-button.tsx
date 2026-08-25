import type { CastButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CastEnterIcon, CastExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/cast-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CastButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.CastButton className={[buttonStyles.root, styles.root, className]} {...props}>
        <CastEnterIcon className={[buttonStyles.icon, styles.enterIcon]} />
        <CastExitIcon className={[buttonStyles.icon, styles.exitIcon]} />
      </$.CastButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'cast-button',
  type: 'component',
  title: 'Cast Button',
  description: 'A state-aware button that starts and stops Google Cast playback.',
} as const satisfies SkinComponentMeta;
