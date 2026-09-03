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

export function MinimalVideoControls() {
  return (
    <$.Controls.Root>
      <$.Controls.Backdrop className={controlsStyles.backdrop} />
      <$.Controls.Content className={[controlsStyles.root, controlsStyles.content, styles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <ButtonTooltip side="top">
              <PlayButton />
            </ButtonTooltip>
            <VolumePopover showTooltip side="right" orientation="horizontal" />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Group className={timeStyles.group}>
              <$.Time.Value className={[timeStyles.toggle, timeStyles.currentValue]} type="current" toggle />
              <$.Time.Separator className={timeStyles.separator} />
              <$.Time.Value className={timeStyles.durationValue} type="duration" />
            </$.Time.Group>
            <TimeSlider previewOverflow="clamp" />
          </$.Controls.Group>

          <$.Controls.Group className={styles.end}>
            <ButtonTooltip side="top">
              <CaptionsButton />
            </ButtonTooltip>
            <VideoSettingsMenu />
            <$.Controls.Group className={styles.trailing}>
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
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
