import { MuteButton as MuteButtonPrimitive } from '@/ui/mute-button';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@/icons';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className="media-button media-mute-button">
      <VolumeOffIcon className="media-button-icon media-mute-button-icon-volume-off" />
      <VolumeLowIcon className="media-button-icon media-mute-button-icon-volume-low" />
      <VolumeHighIcon className="media-button-icon media-mute-button-icon-volume-high" />
    </MuteButtonPrimitive>
  );
}
