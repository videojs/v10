import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import { playButton, playButtonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip.skin';

export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive className={playButton}>
        <RestartIcon className={playButtonIcon.restart} />
        <PlayIcon className={playButtonIcon.play} />
        <PauseIcon className={playButtonIcon.pause} />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
