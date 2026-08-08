import './styles.css';
import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from './icons';
export function MuteButton() {
  return (
    <MuteButtonPrimitive className="media-button-mute">
      <VolumeOffIcon className="media-button-icon-volume-off" />
      <VolumeLowIcon className="media-button-icon-volume-low" />
      <VolumeHighIcon className="media-button-icon-volume-high" />
    </MuteButtonPrimitive>
  );
}
