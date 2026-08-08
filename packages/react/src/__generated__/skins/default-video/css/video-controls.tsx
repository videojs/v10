import './styles.css';
import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { FullscreenButton } from './fullscreen-button/fullscreen-button';
import { PlayButton } from './play-button/play-button';
import { SeekButton } from './seek-button/seek-button';
import { VolumePopover } from './volume-popover/volume-popover';
import { TimeSlider } from './time-slider/time-slider';
const SEEK_SECONDS = 10;
export function DefaultVideoControls() {
  return (
    <Controls.Root className="media-video-controls media-skin media-theme-default">
      <Tooltip.Provider>
        <Controls.Group className="media-controls-group-primary">
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group className="media-controls-group-time">
          <TimePrimitive.Value className="media-time" type="current" />
          <TimeSlider />
          <TimePrimitive.Value className="media-time" type="remaining" toggle />
        </Controls.Group>

        <Controls.Group className="media-controls-group-primary">
          <VolumePopover />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
