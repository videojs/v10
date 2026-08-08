import './styles.css';
import { Popover } from '@videojs/react';
import { MuteButton } from '../mute-button/mute-button';
import { VolumeSlider } from '../volume-slider/volume-slider';
export function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={<MuteButton />} />
      <Popover.Popup className="media-volume-popover">
        <VolumeSlider orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
