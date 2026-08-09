import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react/icons';
export function MuteButton() {
  return (
    <MuteButtonPrimitive className="media-button media-mute-button">
      <VolumeOffIcon className="media-button-icon media-mute-button-icon-volume-off" />
      <VolumeLowIcon className="media-button-icon media-mute-button-icon-volume-low" />
      <VolumeHighIcon className="media-button-icon media-mute-button-icon-volume-high" />
    </MuteButtonPrimitive>
  );
}
