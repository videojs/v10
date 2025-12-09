/**
 * MuteButton - With All Volume Icons
 */

import { MuteButton } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react/icons';

export default function TestFixture() {
  return (
    <MuteButton className="mute-btn">
      <VolumeHighIcon className="volume-high" />
      <VolumeLowIcon className="volume-low" />
      <VolumeOffIcon className="volume-off" />
    </MuteButton>
  );
}
