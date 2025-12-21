import { MuteButton } from '@videojs/react-preview';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react-preview/icons';
import styles from './MuteButton.module.css';

/**
 * Basic MuteButton example demonstrating:
 * - Multi-state icon switching (high/medium/low/off)
 * - Volume level data attributes
 * - Smooth icon transitions
 *
 * Note: This component must be used within a VideoProvider context.
 * See the usage example in the documentation.
 */
export function BasicMuteButton() {
  return (
    <MuteButton className={styles.button}>
      <VolumeHighIcon className={styles.volumeHighIcon} />
      <VolumeLowIcon className={styles.volumeLowIcon} />
      <VolumeOffIcon className={styles.volumeOffIcon} />
    </MuteButton>
  );
}
