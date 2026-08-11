import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className={[styles.button, styles.muteButton]}>
      <VolumeOffIcon className={[styles.buttonIcon, styles.volumeOffIcon]} />
      <VolumeLowIcon className={[styles.buttonIcon, styles.volumeLowIcon]} />
      <VolumeHighIcon className={[styles.buttonIcon, styles.volumeHighIcon]} />
    </MuteButtonPrimitive>
  );
}
