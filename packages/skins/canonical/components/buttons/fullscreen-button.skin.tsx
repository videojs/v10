import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import { button, buttonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip.skin';

export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive className={button.fullscreen}>
        <FullscreenEnterIcon className={buttonIcon.fullscreenEnter} />
        <FullscreenExitIcon className={buttonIcon.fullscreenExit} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
