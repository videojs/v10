import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import { button, buttonIcon, playButton, playButtonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className={[button, playButton]}>
        <RestartIcon className={[buttonIcon, playButtonIcon.restart]} />
        <PlayIcon className={[buttonIcon, playButtonIcon.play]} />
        <PauseIcon className={[buttonIcon, playButtonIcon.pause]} />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
