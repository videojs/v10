import * as $ from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/volume-indicator.styles';

export function VolumeIndicator() {
  return (
    <$.VolumeIndicator.Root className={styles.root}>
      <$.VolumeIndicator.Fill className={styles.fill}>
        <VolumeHighIcon className={[styles.icon, styles.icons.high]} />
        <VolumeLowIcon className={[styles.icon, styles.icons.low]} />
        <VolumeOffIcon className={[styles.icon, styles.icons.off]} />
        <$.VolumeIndicator.Value className={styles.value} />
      </$.VolumeIndicator.Fill>
    </$.VolumeIndicator.Root>
  );
}
