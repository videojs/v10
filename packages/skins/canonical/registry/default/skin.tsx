import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { FullscreenButton } from '@/components/videojs/fullscreen-button/fullscreen-button';
import { PlayButton } from '@/components/videojs/play-button/play-button';
import { SeekButton } from '@/components/videojs/seek-button/seek-button';
import { VolumePopover } from '@/components/videojs/volume-popover/volume-popover';
import { TimeSlider } from '@/components/videojs/time-slider/time-slider';

const SEEK_SECONDS = 10;

export function DefaultVideoSkin() {
  return (
    <Controls.Root className="media-skin media-skin-video media-theme-default flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding font-media text-media leading-none text-media-controls bg-media-surface shadow-media-surface backdrop-blur-media-surface">
      <Tooltip.Provider>
        <Controls.Group className="flex items-center gap-media-controls-gap">
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group className="flex flex-1 items-center gap-media-controls-gap">
          <TimePrimitive.Value className="tabular-nums" type="current" />
          <TimeSlider />
          <TimePrimitive.Value className="tabular-nums" type="remaining" toggle />
        </Controls.Group>

        <Controls.Group className="flex items-center gap-media-controls-gap">
          <VolumePopover />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
