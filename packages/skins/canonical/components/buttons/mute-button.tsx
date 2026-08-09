import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className={[styles.button, styles.muteButton]}>
      <VolumeOffIcon className={[styles.buttonIcon, styles.muteButtonIcon.volumeOff]} />
      <VolumeLowIcon className={[styles.buttonIcon, styles.muteButtonIcon.volumeLow]} />
      <VolumeHighIcon className={[styles.buttonIcon, styles.muteButtonIcon.volumeHigh]} />
    </MuteButtonPrimitive>
  );
}
