import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/core/components';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PlayButton } from '../../components/buttons/play-button';
import { SeekButton } from '../../components/buttons/seek-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { TimeSlider } from '../../components/sliders/time-slider';
import styles from '../../styles/skins/default-video.tailwind';

const SEEK_SECONDS = 10;

export function DefaultVideoSkin() {
  return (
    <Controls.Root className={['media-skin media-skin-video media-theme-default', styles.skin]}>
      <Tooltip.Provider>
        <Controls.Group className={styles.controlsGroup.primary}>
          <PlayButton />
          <SeekButton seconds={-SEEK_SECONDS} />
          <SeekButton seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group className={styles.controlsGroup.time}>
          <TimePrimitive.Value className={styles.time} type="current" />
          <TimeSlider />
          <TimePrimitive.Value className={styles.time} type="remaining" toggle />
        </Controls.Group>

        <Controls.Group className={styles.controlsGroup.primary}>
          <VolumePopover />
          <FullscreenButton />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
