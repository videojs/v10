import { VolumeIndicator as VolumeIndicatorPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/volume-indicator.styles';

export function VolumeIndicator() {
  return (
    <VolumeIndicatorPrimitive.Root className={styles.root}>
      <VolumeIndicatorPrimitive.Fill className={styles.fill}>
        <VolumeHighIcon className={[styles.icon, styles.icons.high]} />
        <VolumeLowIcon className={[styles.icon, styles.icons.low]} />
        <VolumeOffIcon className={[styles.icon, styles.icons.off]} />
        <VolumeIndicatorPrimitive.Value className={styles.value} />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
