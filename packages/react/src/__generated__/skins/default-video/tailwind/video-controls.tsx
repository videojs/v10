import './styles/tailwind.css';
import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { FullscreenButton } from './fullscreen-button/fullscreen-button';
import { PlayButton } from './play-button/play-button';
import { SeekButton } from './seek-button/seek-button';
import { VolumePopover } from './volume-popover/volume-popover';
import { TimeSlider } from './time-slider/time-slider';
const SEEK_SECONDS = 10;
export function DefaultVideoControls() {
  return (
    <Controls.Root className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface media-skin media-theme-default flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding font-media text-media leading-none text-media-controls">
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
