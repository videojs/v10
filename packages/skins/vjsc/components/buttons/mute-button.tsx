import type { MuteButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/mute-button.styles';

export function MuteButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.MuteButton className={[styles.root, className]} {...props}>
      <VolumeOffIcon className={styles.offIcon} />
      <VolumeLowIcon className={styles.lowIcon} />
      <VolumeHighIcon className={styles.highIcon} />
    </$.MuteButton>
  );
}

export const meta = {
  name: 'mute-button',
  type: 'component',
  title: 'Mute Button',
  description: 'A state-aware mute button used by the volume control.',
} as const satisfies SkinComponentMeta;
