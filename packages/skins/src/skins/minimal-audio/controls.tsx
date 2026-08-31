import * as $ from '@videojs/core/vjsc';

import { SeekButton } from '../../components/buttons/seek-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import popupStyles from '../../styles/popups/popup.styles';
import { AudioPlayButton } from '../audio/play-button';
import { AudioSettingsMenu } from '../audio/settings-menu';
import { AudioTimeSlider } from '../audio/time-slider';
import volumePopoverStyles from '../audio/volume-popover.styles';
import styles from './controls.styles';

export function MinimalAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', popupStyles.surface, styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <AudioPlayButton />
            <SeekButton seconds={-10} />
            <SeekButton seconds={10} />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Group className={styles.timeGroup}>
              <$.Time.Value className={styles.currentValue} type="current" toggle />
              <$.Time.Separator className={styles.timeSeparator} />
              <$.Time.Value className={styles.durationValue} type="duration" />
            </$.Time.Group>
            <AudioTimeSlider />
          </$.Controls.Group>

          <$.Controls.Group className={styles.end}>
            <VolumePopover
              popupClassName={volumePopoverStyles.popup}
              showTooltip
              side="left"
              orientation="horizontal"
            />
            <AudioSettingsMenu />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
