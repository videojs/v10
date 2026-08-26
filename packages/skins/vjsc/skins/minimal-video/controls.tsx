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
import styles from './controls.styles';

export function MinimalVideoControls() {
  return (
    <$.Controls.Root className={styles.provider}>
      <$.Controls.Backdrop className={styles.backdrop} />
      <$.Controls.Content className={['media-controls', styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <PlayButton />
            <VolumePopover side="right" orientation="horizontal" />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Group className={styles.timeGroup}>
              <$.Time.Value className={styles.currentValue} type="current" toggle />
              <$.Time.Separator className={styles.timeSeparator} />
              <$.Time.Value className={styles.durationValue} type="duration" />
            </$.Time.Group>
            <TimeSlider />
          </$.Controls.Group>

          <$.Controls.Group className={styles.end}>
            <CaptionsButton />
            <VideoSettingsMenu />
            <$.Controls.Group className={styles.trailing}>
              <CastButton />
              <AirPlayButton />
              <PiPButton />
              <FullscreenButton />
            </$.Controls.Group>
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
