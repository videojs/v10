import { MuteButton as MuteButtonPrimitive } from '@/ui/mute-button';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className="media-button media-mute-button">
      <VolumeOffIcon className="media-button-icon media-volume-off-icon" />
      <VolumeLowIcon className="media-button-icon media-volume-low-icon" />
      <VolumeHighIcon className="media-button-icon media-volume-high-icon" />
    </MuteButtonPrimitive>
  );
}
