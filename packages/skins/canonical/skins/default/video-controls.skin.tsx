import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/core/components';
import { FullscreenButton } from '../../components/buttons/fullscreen-button.skin';
import { PlayButton } from '../../components/buttons/play-button.skin';
import { SeekButton } from '../../components/buttons/seek-button.skin';
import { VolumePopover } from '../../components/controls/volume-popover.skin';
import { TimeSlider } from '../../components/sliders/time-slider.skin';
import { controlsGroup, time, videoControls } from '../../styles/skins/default-video-controls.tailwind';

const SEEK_SECONDS = 10;

export function DefaultVideoControls() {
  return (
    <Controls.Root className={videoControls}>
      <Tooltip.Provider>
        <Controls.Group className={controlsGroup.base}>
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group className={controlsGroup.time}>
          <TimePrimitive.Value className={time} type="current" />
          <TimeSlider />
          <TimePrimitive.Value className={time} type="remaining" toggle />
        </Controls.Group>

        <Controls.Group className={controlsGroup.base}>
          <VolumePopover />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
