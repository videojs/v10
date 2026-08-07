import './styles.css';
import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from './icons';
export function MuteButton() {
  return (
    <MuteButtonPrimitive className="vjs-button-mute">
      <VolumeOffIcon className="vjs-button-icon-volume-off" />
      <VolumeLowIcon className="vjs-button-icon-volume-low" />
      <VolumeHighIcon className="vjs-button-icon-volume-high" />
    </MuteButtonPrimitive>
  );
}
