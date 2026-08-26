import type { MuteButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/mute-button.styles';

export function MuteButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.MuteButton className={[buttonStyles.root, styles.root, className]} {...props}>
      <VolumeOffIcon className={[buttonStyles.icon, styles.offIcon]} />
      <VolumeLowIcon className={[buttonStyles.icon, styles.lowIcon]} />
      <VolumeHighIcon className={[buttonStyles.icon, styles.highIcon]} />
    </$.MuteButton>
  );
}

export const meta = {
  name: 'mute-button',
  type: 'component',
  title: 'Mute Button',
  description: 'A state-aware mute button used by the volume control.',
} as const satisfies SkinComponentMeta;
