import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';
import { button, buttonIcon, muteButton, muteButtonIcon } from '../../styles/components/button.tailwind';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className={[button, muteButton]}>
      <VolumeOffIcon className={[buttonIcon, muteButtonIcon.volumeOff]} />
      <VolumeLowIcon className={[buttonIcon, muteButtonIcon.volumeLow]} />
      <VolumeHighIcon className={[buttonIcon, muteButtonIcon.volumeHigh]} />
    </MuteButtonPrimitive>
  );
}
