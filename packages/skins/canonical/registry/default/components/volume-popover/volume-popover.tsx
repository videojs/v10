import type { PopoverProps, VolumeSliderProps } from '@videojs/core';
import { Popover, usePlayer } from '@videojs/react';
import { MuteButton } from '@/components/videojs/mute-button/mute-button';
import { VolumeSlider } from '@/components/videojs/volume-slider/volume-slider';

export interface VolumePopoverProps {
  side?: PopoverProps['side'];
  orientation?: VolumeSliderProps['orientation'];
}

export function VolumePopover({ side = 'top', orientation = 'vertical' }: VolumePopoverProps = {}) {
  const volumeAvailability = usePlayer((state) => state.volumeAvailability);
  return volumeAvailability === 'available' ? (
    <Popover.Root openOnHover delay={200} closeDelay={100} side={side}>
      <Popover.Trigger render={<MuteButton />} />
      <Popover.Popup className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface m-0 rounded-media-pill border-0 py-3 has-[media-volume-slider[data-hidden]]:hidden">
        <VolumeSlider orientation={orientation} />
      </Popover.Popup>
    </Popover.Root>
  ) : (
    <MuteButton />
  );
}
