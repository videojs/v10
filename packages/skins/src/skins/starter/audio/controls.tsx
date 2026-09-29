import * as $ from '@videojs/core/vjsc';

import { ControlsContent, type ThumbnailSlot } from '../shared/components';
import { SeekButton } from '../shared/seek-button';
import styles from '../shared/skin.styles';

export function AudioControls({ renderThumbnail }: ThumbnailSlot = {}) {
  return (
    <$.Controls.Root visibility="always">
      <ControlsContent
        audio
        renderThumbnail={renderThumbnail}
        seekBackward={<SeekButton className={styles.audioSeek} seconds={-10} />}
        seekForward={<SeekButton className={styles.audioSeek} seconds={10} />}
      />
    </$.Controls.Root>
  );
}
