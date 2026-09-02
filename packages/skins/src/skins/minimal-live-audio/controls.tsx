import * as $ from '@videojs/core/vjsc';
import { Box } from 'vjsc/components';

import { LiveButton } from '../../components/buttons/live-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import audioControlsStyles from '../../styles/layout/audio-controls.styles';
import { AudioPlayButton } from '../audio/play-button';

export function MinimalLiveAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <$.Controls.Content className={[audioControlsStyles.root, audioControlsStyles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={audioControlsStyles.start}>
            <AudioPlayButton />
            <LiveButton />
          </$.Controls.Group>

          <Box aria-hidden="true" className={audioControlsStyles.spacer} />

          <$.Controls.Group className={audioControlsStyles.end}>
            <VolumePopover boundary="viewport" showTooltip side="left" orientation="horizontal" />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
