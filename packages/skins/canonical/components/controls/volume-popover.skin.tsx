import { Popover } from '@videojs/core/components';
import { volumePopover } from '../../styles/components/popup.tailwind';
import { MuteButton } from '../buttons/mute-button.skin';
import { VolumeSlider } from '../sliders/volume-slider.skin';

export function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger>
        <MuteButton />
      </Popover.Trigger>
      <Popover.Popup className={volumePopover}>
        <VolumeSlider orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
