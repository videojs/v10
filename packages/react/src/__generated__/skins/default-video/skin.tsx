import { Controls } from '@/ui/controls';
import { Time as TimePrimitive } from '@/ui/time';
import { Tooltip } from '@/ui/tooltip';
import { FullscreenButton } from './components/buttons/fullscreen-button';
import { PlayButton } from './components/buttons/play-button';
import { SeekButton } from './components/buttons/seek-button';
import { VolumePopover } from './components/controls/volume-popover';
import { TimeSlider } from './components/sliders/time-slider';

const SEEK_SECONDS = 10;

export function DefaultVideoSkin() {
  return (
    <Controls.Root className="media-skin media-skin-video media-theme-default">
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
