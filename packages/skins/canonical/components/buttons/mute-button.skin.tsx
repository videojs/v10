import { MuteButton as MuteButtonPrimitive } from '@videojs/core/components';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/icons/components';

export function MuteButton() {
  return (
    <MuteButtonPrimitive>
      <VolumeOffIcon />
      <VolumeLowIcon />
      <VolumeHighIcon />
    </MuteButtonPrimitive>
  );
}
