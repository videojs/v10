import * as $ from '@videojs/core/vjsc';
import { Box } from 'vjsc/components';

import { AirPlayButton } from '../../components/buttons/airplay-button';
import { CastButton } from '../../components/buttons/cast-button';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { LiveButton } from '../../components/buttons/live-button';
import { PiPButton } from '../../components/buttons/pip-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { CaptionsMenu } from '../../components/menus/captions-menu';
import styles from './controls.styles';

export function MinimalLiveVideoControls() {
  return (
    <$.Controls.Root className={styles.provider}>
      <$.Controls.Backdrop className={styles.backdrop} />
      <$.Controls.Content className={['media-controls', styles.root]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.start}>
            <PlayButton />
            <LiveButton />
            <VolumePopover showTooltip side="right" orientation="horizontal" />
          </$.Controls.Group>

          <Box aria-hidden="true" className={styles.spacer} />

          <$.Controls.Group className={styles.end}>
            <CaptionsMenu />
            <CastButton />
            <AirPlayButton />
            <PiPButton />
            <FullscreenButton />
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Content>
    </$.Controls.Root>
  );
}
