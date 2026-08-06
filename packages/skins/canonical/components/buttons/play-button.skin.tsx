import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import { ButtonTooltip } from './button-tooltip.skin';

export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive>
        <RestartIcon />
        <PlayIcon />
        <PauseIcon />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
