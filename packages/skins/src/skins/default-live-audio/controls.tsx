import * as $ from '@videojs/core/vjsc';
import { Box } from 'vjsc/components';

import { LiveButton } from '../../components/buttons/live-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import popupStyles from '../../styles/popups/popup.styles';
import { AudioPlayButton } from '../audio/play-button';
import styles from './controls.styles';

export function DefaultLiveAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', popupStyles.surface, styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <AudioPlayButton />
            <LiveButton />
          </$.Controls.Group>

          <Box aria-hidden="true" className={styles.spacer} />

          <$.Controls.Group className={styles.end}>
            <VolumePopover />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
