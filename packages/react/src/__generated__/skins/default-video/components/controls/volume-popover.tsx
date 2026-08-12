import { Popover } from '@/ui/popover';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';

export function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={<MuteButton />} />
      <Popover.Popup className="media-surface media-volume-popover">
        <VolumeSlider orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
