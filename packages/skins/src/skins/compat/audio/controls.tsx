import * as $ from '@videojs/core/vjsc';

import { ControlsContent } from '../shared/controls';
import { SeekButton } from '../shared/seek-button';
import seekButtonStyles from '../shared/seek-button.styles';
import { type ThumbnailSlot } from '../shared/time-slider';

export function AudioControls({ renderThumbnail }: ThumbnailSlot = {}) {
  return (
    <$.Controls.Root visibility="always">
      <ControlsContent
        audio
        renderThumbnail={renderThumbnail}
        seekBackward={<SeekButton className={seekButtonStyles.audio} seconds={-10} />}
        seekForward={<SeekButton className={seekButtonStyles.audio} seconds={10} />}
      />
    </$.Controls.Root>
  );
}
