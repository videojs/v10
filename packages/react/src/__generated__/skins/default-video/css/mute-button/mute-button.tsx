import './styles.css';
import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react/icons';
export function MuteButton() {
  return (
    <MuteButtonPrimitive className="media-mute-button">
      <VolumeOffIcon className="media-mute-button-icon-volume-off" />
      <VolumeLowIcon className="media-mute-button-icon-volume-low" />
      <VolumeHighIcon className="media-mute-button-icon-volume-high" />
    </MuteButtonPrimitive>
  );
}
