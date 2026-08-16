import { VolumeIndicator as VolumeIndicatorPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/volume-indicator.tailwind';

export function VolumeIndicator() {
  return (
    <VolumeIndicatorPrimitive.Root className={styles.volumeIndicator}>
      <VolumeIndicatorPrimitive.Fill className={styles.volumeIndicatorFill}>
        <VolumeHighIcon className={[styles.volumeIndicatorIcon, styles.volumeHighIndicatorIcon]} />
        <VolumeLowIcon className={[styles.volumeIndicatorIcon, styles.volumeLowIndicatorIcon]} />
        <VolumeOffIcon className={[styles.volumeIndicatorIcon, styles.volumeOffIndicatorIcon]} />
        <VolumeIndicatorPrimitive.Value className={styles.volumeIndicatorValue} />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
