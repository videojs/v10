import * as $ from '@videojs/core/vjsc';
import { Box } from 'vjsc/components';

import { AudioPlayButton } from '../../components/buttons/audio-play-button';
import { LiveButton } from '../../components/buttons/live-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import surfaceStyles from '../../styles/surfaces/surface.styles';
import styles from './controls.styles';

export function DefaultLiveAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={['media-controls', surfaceStyles.root, styles.root]}>
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
