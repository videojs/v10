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
      <Popover.Popup className="relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] m-0 overflow-visible border-0 text-inherit [--popup-translate-distance:0.5rem] [transition-property:opacity,filter,transform,scale] [transition-duration:var(--popup-transition-duration)] [transition-timing-function:ease-out] data-starting-style:opacity-0 data-starting-style:[filter:blur(4px)] data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:[filter:blur(4px)] data-ending-style:scale-95 data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left before:pointer-events-auto before:absolute data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full rounded-media-pill py-3 data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:backdrop-blur-none data-[side=right]:after:hidden data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset) data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset) has-[media-volume-slider[data-hidden]]:hidden">
        <VolumeSlider orientation={orientation} />
      </Popover.Popup>
    </Popover.Root>
  ) : (
    <MuteButton />
  );
}
