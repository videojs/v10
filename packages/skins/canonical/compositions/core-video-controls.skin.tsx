import { Controls, Tooltip } from '@videojs/core/components';
import { FullscreenButton } from '../components/buttons/fullscreen-button.skin';
import { PlayButton } from '../components/buttons/play-button.skin';
import { SeekButton } from '../components/buttons/seek-button.skin';
import { TimeSlider } from '../components/sliders/time-slider.skin';
import { TimeControls } from '../components/time/time-controls.skin';
import { VolumeControl } from '../components/volume/volume-control.skin';

const SEEK_SECONDS = 10;

export function CoreVideoControls() {
  return (
    <Controls.Root>
      <Tooltip.Provider>
        <Controls.Group>
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <TimeControls>
          <TimeSlider />
        </TimeControls>

        <Controls.Group>
          <VolumeControl />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
