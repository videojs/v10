import * as $ from '@videojs/core/vjsc';

import type { ThumbnailSlot } from '../shared/components';
import { SeekButton } from '../shared/seek-button';
import styles from '../shared/skin.styles';
import { VideoControlsContent } from '../shared/video-controls';

export function VideoControls({ renderThumbnail }: ThumbnailSlot = {}) {
  return (
    <$.Controls.Root>
      <VideoControlsContent
        center
        renderThumbnail={renderThumbnail}
        seekBackward={
          <SeekButton
            className={[styles.centerButton, styles.centerSeek]}
            iconClassName={styles.centerSeekIcon}
            seconds={-10}
            tooltip={false}
          />
        }
        seekForward={
          <SeekButton
            className={[styles.centerButton, styles.centerSeek]}
            iconClassName={styles.centerSeekIcon}
            seconds={10}
            tooltip={false}
          />
        }
      />
    </$.Controls.Root>
  );
}
