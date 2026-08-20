import type { VolumeIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/volume-indicator.styles';

export function VolumeIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.VolumeIndicator.Root className={[styles.root, className]} {...props}>
      <$.VolumeIndicator.Fill className={styles.fill}>
        <VolumeHighIcon className={[styles.icon, styles.icons.high]} />
        <VolumeLowIcon className={[styles.icon, styles.icons.low]} />
        <VolumeOffIcon className={[styles.icon, styles.icons.off]} />
        <$.VolumeIndicator.Value className={styles.value} />
      </$.VolumeIndicator.Fill>
    </$.VolumeIndicator.Root>
  );
}
