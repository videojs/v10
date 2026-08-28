import * as $ from '@videojs/core/vjsc';

import { AudioPlayButton } from '../../components/buttons/audio-play-button';
import { SeekButton } from '../../components/buttons/seek-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { AudioSettingsMenu } from '../../components/menus/audio-settings-menu';
import { AudioTimeSlider } from '../../components/sliders/audio-time-slider';
import styles from './controls.styles';

export function MinimalAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', styles.root]}>
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
            <VolumePopover showTooltip side="left" orientation="horizontal" />
            <AudioSettingsMenu />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
