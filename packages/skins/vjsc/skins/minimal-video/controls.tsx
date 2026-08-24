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
    <$.Controls.Root className={styles.controls.root} data-controls="">
      <$.Controls.Backdrop className={styles.controls.backdrop} />
      <$.Tooltip.Provider>
        <$.Controls.Group className={styles.controls.start}>
          <PlayButton />
          <VolumePopover side="right" orientation="horizontal" />
        </$.Controls.Group>

        <$.Controls.Group className={styles.timeSliderGroup}>
          <$.Time.Group className={styles.time.group}>
            <$.Time.Value className={styles.time.current} type="current" toggle />
            <$.Time.Separator className={styles.time.separator} />
            <$.Time.Value className={styles.time.duration} type="duration" />
          </$.Time.Group>
          <TimeSlider />
        </$.Controls.Group>

        <$.Controls.Group className={styles.controls.end}>
          <CaptionsButton />
          <VideoSettingsMenu />
          <$.Controls.Group className={styles.controls.remote}>
            <CastButton />
            <AirPlayButton />
            <PiPButton />
            <FullscreenButton />
          </$.Controls.Group>
        </$.Controls.Group>
      </$.Tooltip.Provider>
    </$.Controls.Root>
  );
}
