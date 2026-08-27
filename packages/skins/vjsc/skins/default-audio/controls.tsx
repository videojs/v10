import * as $ from '@videojs/core/vjsc';

import { AudioPlayButton } from '../../components/buttons/audio-play-button';
import { SeekButton } from '../../components/buttons/seek-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { AudioSettingsMenu } from '../../components/menus/audio-settings-menu';
import { AudioTimeSlider } from '../../components/sliders/audio-time-slider';
import surfaceStyles from '../../styles/surfaces/surface.styles';
import styles from './controls.styles';

export function DefaultAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', surfaceStyles.root, styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <AudioPlayButton />
            <SeekButton className={styles.seekButton} seconds={-10} />
            <SeekButton className={styles.seekButton} seconds={10} />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeSliderGroup}>
            <$.Time.Value className={styles.currentValue} type="current" />
            <AudioTimeSlider />
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
