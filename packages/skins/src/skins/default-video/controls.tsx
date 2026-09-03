import * as $ from '@videojs/core/vjsc';

import { AirPlayButton } from '../../components/buttons/airplay-button';
import { ButtonTooltip } from '../../components/buttons/button-tooltip';
import { CaptionsButton } from '../../components/buttons/captions-button';
import { CastButton } from '../../components/buttons/cast-button';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PiPButton } from '../../components/buttons/pip-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { TimeSlider } from '../../components/sliders/time-slider';
import controlsStyles from '../../styles/layout/controls.styles';
import timeStyles from '../../styles/layout/time.styles';
import { VideoSettingsMenu } from '../video/settings-menu';
import styles from './controls.styles';

export function DefaultVideoControls() {
  return (
    <$.Controls.Root>
      <$.Controls.Backdrop className={controlsStyles.backdrop} />
      <$.Controls.Content className={[controlsStyles.root, controlsStyles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={controlsStyles.primary}>
            <ButtonTooltip side="top">
              <PlayButton />
            </ButtonTooltip>
            <VolumePopover className={styles.volumeButton} />

            <$.Controls.Group className={styles.timeSliderGroup}>
              <$.Time.Value className={[timeStyles.value, styles.timeValue]} type="current" />
              <TimeSlider />
              <$.Time.Value className={[timeStyles.toggle, styles.timeValue]} type="remaining" toggle />
            </$.Controls.Group>

            <ButtonTooltip side="top">
              <CaptionsButton className={styles.captionsButton} />
            </ButtonTooltip>
            <VideoSettingsMenu className={styles.settingsButton} />
          </$.Controls.Group>

          <$.Controls.Group className={controlsStyles.secondary}>
            <ButtonTooltip side="top">
              <CastButton />
            </ButtonTooltip>
            <ButtonTooltip side="top">
              <AirPlayButton />
            </ButtonTooltip>
            <ButtonTooltip side="top">
              <PiPButton />
            </ButtonTooltip>
            <ButtonTooltip side="top">
              <FullscreenButton />
            </ButtonTooltip>
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
