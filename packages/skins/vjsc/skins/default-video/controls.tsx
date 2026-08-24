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

export function DefaultVideoControls() {
  return (
    <$.Controls.Root className={styles.controls.root} data-controls="">
      <$.Controls.Backdrop className={styles.controls.backdrop} />
      <$.Tooltip.Provider>
        <$.Controls.Group className={styles.controls.primary}>
          <PlayButton />
          <VolumePopover />

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Value className={styles.time.current} type="current" />
            <TimeSlider />
            <$.Time.Value className={styles.time.remaining} type="remaining" toggle />
          </$.Controls.Group>

          <CaptionsButton className={styles.buttons.captions} />
          <VideoSettingsMenu />
        </$.Controls.Group>

        <$.Controls.Group className={styles.controls.secondary}>
          <CastButton />
          <AirPlayButton />
          <PiPButton />
          <FullscreenButton />
        </$.Controls.Group>
      </$.Tooltip.Provider>
    </$.Controls.Root>
  );
}
