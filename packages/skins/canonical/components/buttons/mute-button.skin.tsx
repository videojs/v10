import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import { muteButton, muteButtonIcon } from '../../styles/components/button.tailwind';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className={muteButton}>
      <VolumeOffIcon className={muteButtonIcon.volumeOff} />
      <VolumeLowIcon className={muteButtonIcon.volumeLow} />
      <VolumeHighIcon className={muteButtonIcon.volumeHigh} />
    </MuteButtonPrimitive>
  );
}
