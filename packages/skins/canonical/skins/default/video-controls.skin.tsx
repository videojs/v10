import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/core/components';
import { FullscreenButton } from '../../components/buttons/fullscreen-button.skin';
import { PlayButton } from '../../components/buttons/play-button.skin';
import { SeekButton } from '../../components/buttons/seek-button.skin';
import { VolumePopover } from '../../components/controls/volume-popover.skin';
import { TimeSlider } from '../../components/sliders/time-slider.skin';

const SEEK_SECONDS = 10;

export function DefaultVideoControls() {
  return (
    <Controls.Root>
      <Tooltip.Provider>
        <Controls.Group>
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group>
          <TimePrimitive.Value type="current" />
          <TimeSlider />
          <TimePrimitive.Value type="remaining" toggle />
        </Controls.Group>

        <Controls.Group>
          <VolumePopover />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
