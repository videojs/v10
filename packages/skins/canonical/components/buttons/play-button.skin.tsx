import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import { button, buttonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip.skin';

export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive className={button.play}>
        <RestartIcon className={buttonIcon.restart} />
        <PlayIcon className={buttonIcon.play} />
        <PauseIcon className={buttonIcon.pause} />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
