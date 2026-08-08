import '../styles/tailwind.css';
import { Popover } from '@videojs/react';
import { MuteButton } from '../mute-button/mute-button';
import { VolumeSlider } from '../volume-slider/volume-slider';
export function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={<MuteButton />} />
      <Popover.Popup className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface m-0 rounded-media-pill border-0 py-3">
        <VolumeSlider orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
