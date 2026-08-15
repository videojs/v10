import { VolumeIndicator as VolumeIndicatorPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import popupStyles from '../../styles/components/popup.tailwind';
import styles from '../../styles/components/volume-indicator.tailwind';

export function VolumeIndicator({ variant = 'default' }: { variant?: 'default' | 'minimal' } = {}) {
  return (
    <VolumeIndicatorPrimitive.Root
      className={
        variant === 'minimal'
          ? [styles.volumeIndicator, styles.volumeIndicatorMinimal]
          : [popupStyles.surface, styles.volumeIndicator]
      }
    >
      <VolumeIndicatorPrimitive.Fill
        className={
          variant === 'minimal'
            ? [styles.volumeIndicatorFill, styles.volumeIndicatorFillMinimal]
            : styles.volumeIndicatorFill
        }
      >
        <VolumeHighIcon className={[styles.volumeIndicatorIcon, styles.volumeHighIndicatorIcon]} />
        <VolumeLowIcon className={[styles.volumeIndicatorIcon, styles.volumeLowIndicatorIcon]} />
        <VolumeOffIcon className={[styles.volumeIndicatorIcon, styles.volumeOffIndicatorIcon]} />
        <VolumeIndicatorPrimitive.Value className={styles.volumeIndicatorValue} />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
