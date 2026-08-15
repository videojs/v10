import type { PopoverProps, VolumeSliderProps } from '@videojs/core';
import { Popover } from '@/ui/popover';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';
import { usePlayer } from '@/player/context';

export interface VolumePopoverProps {
  side?: PopoverProps['side'];
  orientation?: VolumeSliderProps['orientation'];
}

export function VolumePopover({ side = 'top', orientation = 'vertical' }: VolumePopoverProps = {}) {
  const volumeAvailability = usePlayer((state) => state.volumeAvailability);
  return volumeAvailability === 'available' ? (
    <Popover.Root openOnHover delay={200} closeDelay={100} side={side}>
      <Popover.Trigger render={<MuteButton />} />
      <Popover.Popup className="media-surface media-volume-popover">
        <VolumeSlider orientation={orientation} />
      </Popover.Popup>
    </Popover.Root>
  ) : (
    <MuteButton />
  );
}
