/**
 * PlayButton - With Icons
 */

import { PlayButton } from '@videojs/react';
import { PauseIcon, PlayIcon } from '@videojs/react/icons';

export default function TestFixture() {
  return (
    <PlayButton className="play-btn">
      <PlayIcon className="play-icon" />
      <PauseIcon className="pause-icon" />
    </PlayButton>
  );
}
