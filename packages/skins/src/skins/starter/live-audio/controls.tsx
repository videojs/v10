import * as $ from '@videojs/core/vjsc';

import { ControlsContent } from '../shared/components';

export function LiveAudioControls() {
  return (
    <$.Controls.Root visibility="always">
      <ControlsContent audio live />
    </$.Controls.Root>
  );
}
