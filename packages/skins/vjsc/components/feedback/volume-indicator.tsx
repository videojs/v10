import type { VolumeIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/feedback/volume-indicator.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';

export function VolumeIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.VolumeIndicator.Root className={[surfaceStyles.feedback, styles.root, className]} {...props}>
      <$.VolumeIndicator.Fill className={styles.fill}>
        <VolumeHighIcon className={styles.highIcon} />
        <VolumeLowIcon className={styles.lowIcon} />
        <VolumeOffIcon className={styles.offIcon} />
        <$.VolumeIndicator.Value className={styles.value} />
      </$.VolumeIndicator.Fill>
    </$.VolumeIndicator.Root>
  );
}

export const meta = {
  name: 'volume-indicator',
  type: 'component',
  title: 'Volume Indicator',
  description: 'Visual feedback for mute and volume changes.',
} as const satisfies SkinComponentMeta;
