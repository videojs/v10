import * as $ from '@videojs/core/vjsc';

import { ControlsContent, type ControlsSlots } from './components';
import { ScreenControls } from './screen-controls';
import { SettingsMenu } from './settings-menu';
import styles from './skin.styles';

export function VideoControlsContent({
  center = false,
  live = false,
  renderThumbnail,
  seekBackward,
  seekForward,
}: ControlsSlots & { center?: boolean; live?: boolean } = {}) {
  return (
    <>
      <$.Controls.Backdrop className={styles.controlsBackdrop} />
      <ControlsContent
        center={center}
        live={live}
        menu={<SettingsMenu />}
        renderThumbnail={renderThumbnail}
        seekBackward={seekBackward}
        seekForward={seekForward}
        top={<ScreenControls />}
      />
    </>
  );
}
