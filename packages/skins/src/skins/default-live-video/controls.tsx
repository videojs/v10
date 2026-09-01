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
import controlsStyles from '../../styles/layout/controls.styles';
import popupStyles from '../../styles/popups/popup.styles';
import styles from './controls.styles';

export function DefaultLiveVideoControls() {
  return (
    <$.Controls.Root>
      <$.Controls.Backdrop className={styles.backdrop} />
      <$.Controls.Content className={[controlsStyles.root, controlsStyles.surface, styles.content]}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={[popupStyles.surface, styles.primary]}>
            <PlayButton />
            <LiveButton />
            <Box aria-hidden="true" className={styles.spacer} />
            <VolumePopover />
            <CaptionsMenu className={styles.captionsMenu} />
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
