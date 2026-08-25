import type { MuteButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/button.styles';

export function MuteButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.MuteButton className={[styles.root, styles.mute, className]} {...props}>
      <VolumeOffIcon className={[styles.icon, styles.icons.volumeOff]} />
      <VolumeLowIcon className={[styles.icon, styles.icons.volumeLow]} />
      <VolumeHighIcon className={[styles.icon, styles.icons.volumeHigh]} />
    </$.MuteButton>
  );
}

export const meta = {
  name: 'mute-button',
  type: 'component',
  title: 'Mute Button',
  description: 'A state-aware mute button used by the volume control.',
} as const satisfies SkinComponentMeta;
