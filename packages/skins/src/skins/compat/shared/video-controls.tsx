import * as $ from '@videojs/core/vjsc';

import { ControlsContent, type ControlsSlots } from './controls';
import controlsStyles from './controls.styles';
import { ScreenControls } from './screen-controls';
import { SettingsMenu } from './settings-menu';

export function VideoControlsContent({
  center = false,
  live = false,
  renderThumbnail,
  seekBackward,
  seekForward,
}: ControlsSlots & { center?: boolean; live?: boolean } = {}) {
  return (
    <>
      <$.Controls.Backdrop className={controlsStyles.backdrop} />
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
