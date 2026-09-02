import type { CastButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CastEnterIcon, CastExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/cast-button.styles';
import { Button } from './button';

export function CastButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.CastButton $render={Button} className={[styles.root, className]} {...props}>
      <CastEnterIcon className={[buttonStyles.icon, styles.enterIcon]} />
      <CastExitIcon className={[buttonStyles.icon, styles.exitIcon]} />
    </$.CastButton>
  );
}

export const meta = {
  title: 'Cast Button',
  description: 'A state-aware button that starts and stops Google Cast playback.',
} as const satisfies SkinComponentDescription;
