import * as $ from '@videojs/core/vjsc';

import { VideoControlsContent } from '../shared/video-controls';

export function LiveVideoControls() {
  return (
    <$.Controls.Root>
      <VideoControlsContent center live />
    </$.Controls.Root>
  );
}
