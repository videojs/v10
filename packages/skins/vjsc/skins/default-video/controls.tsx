import * as $ from '@videojs/core/vjsc';

import { AirPlayButton } from '../../components/buttons/airplay-button';
import { CaptionsButton } from '../../components/buttons/captions-button';
import { CastButton } from '../../components/buttons/cast-button';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PiPButton } from '../../components/buttons/pip-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { VideoSettingsMenu } from '../../components/menus/video-settings-menu';
import { TimeSlider } from '../../components/sliders/time-slider';
import surfaceStyles from '../../styles/surfaces/surface.styles';
import styles from './controls.styles';

export function DefaultVideoControls() {
  return (
    <$.Controls.Root className={styles.provider}>
      <$.Controls.Backdrop className={styles.backdrop} />
      <$.Controls.Content className={['media-controls', styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={[surfaceStyles.root, styles.primary]}>
            <PlayButton />
            <VolumePopover />

            <$.Controls.Group className={styles.timeSliderGroup}>
              <$.Time.Value className={styles.currentValue} type="current" />
              <TimeSlider />
              <$.Time.Value className={styles.remainingValue} type="remaining" toggle />
            </$.Controls.Group>

            <CaptionsButton className={styles.captionsButton} />
            <VideoSettingsMenu />
          </$.Controls.Group>

          <$.Controls.Group className={[surfaceStyles.root, styles.secondary]}>
            <CastButton />
            <AirPlayButton />
            <PiPButton />
            <FullscreenButton />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
