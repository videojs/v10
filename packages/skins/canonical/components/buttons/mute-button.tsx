import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className={[styles.root, styles.mute]}>
      <VolumeOffIcon className={[styles.icon, styles.icons.volumeOff]} />
      <VolumeLowIcon className={[styles.icon, styles.icons.volumeLow]} />
      <VolumeHighIcon className={[styles.icon, styles.icons.volumeHigh]} />
    </MuteButtonPrimitive>
  );
}
