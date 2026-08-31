import * as $ from '@videojs/core/vjsc';

import { SeekButton } from '../../components/buttons/seek-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import popupStyles from '../../styles/popups/popup.styles';
import { AudioPlayButton } from '../audio/play-button';
import { AudioSettingsMenu } from '../audio/settings-menu';
import { AudioTimeSlider } from '../audio/time-slider';
import styles from './controls.styles';

export function DefaultAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', popupStyles.surface, styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <AudioPlayButton />
            <SeekButton className={styles.seekButton} seconds={-10} />
            <SeekButton className={styles.seekButton} seconds={10} />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Value className={styles.currentValue} type="current" />
            <AudioTimeSlider previewOverflow="visible" />
            <$.Time.Value className={styles.remainingValue} type="remaining" toggle />
          </$.Controls.Group>

          <$.Controls.Group className={styles.end}>
            <AudioSettingsMenu />
            <VolumePopover />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
