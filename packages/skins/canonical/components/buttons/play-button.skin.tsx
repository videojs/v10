import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import { Tooltip } from '../overlays/tooltip.skin';

export function PlayButton() {
  return (
    <Tooltip>
      <PlayButtonPrimitive>
        <RestartIcon />
        <PlayIcon />
        <PauseIcon />
      </PlayButtonPrimitive>
    </Tooltip>
  );
}
