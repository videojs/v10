import * as $ from '@videojs/core/vjsc';
import { Box } from 'vjsc/components';

import { LiveButton } from '../../components/buttons/live-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import audioControlsStyles from '../../styles/layout/audio-controls.styles';
import popupStyles from '../../styles/popups/popup.styles';
import { AudioPlayButton } from '../audio/play-button';
import styles from './controls.styles';

export function DefaultLiveAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={[audioControlsStyles.root, popupStyles.surface, styles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <AudioPlayButton />
            <LiveButton />
          </$.Controls.Group>

          <Box aria-hidden="true" className={styles.spacer} />

          <$.Controls.Group className={styles.end}>
            <VolumePopover boundary="viewport" />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
