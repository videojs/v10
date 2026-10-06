import * as $ from '@videojs/core/vjsc';

import { ButtonTooltip } from '../../../../components/buttons/button-tooltip';
import { SeekButton } from '../../../../components/buttons/seek-button';
import { VolumePopover } from '../../../../components/menus/volume-popover';
import timeStyles from '../../../../styles/display/time.styles';
import audioControlsStyles from '../../../../styles/layout/audio-controls.styles';
import { AudioPlayButton } from '../../../shared/audio/buttons/play-button';
import { AudioSettingsMenu } from '../../../shared/audio/menus/settings-menu';
import { AudioTimeSlider } from '../../../shared/audio/sliders/time-slider';
import styles from './controls.styles';

export function DefaultAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={[audioControlsStyles.root, audioControlsStyles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={audioControlsStyles.start}>
            <AudioPlayButton />
            <ButtonTooltip boundary="viewport" side="top">
              <SeekButton className={styles.seekButton} seconds={-10} />
            </ButtonTooltip>
            <ButtonTooltip boundary="viewport" side="top">
              <SeekButton className={styles.seekButton} seconds={10} />
            </ButtonTooltip>
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Value className={timeStyles.value} type="current" />
            <AudioTimeSlider previewOverflow="visible" />
            <$.Time.Value className={[timeStyles.toggle, styles.remainingValue]} type="remaining" toggle />
          </$.Controls.Group>

          <$.Controls.Group className={audioControlsStyles.end}>
            <AudioSettingsMenu />
            <VolumePopover boundary="viewport" />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
