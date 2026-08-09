import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import { button, buttonIcon, fullscreenButton, fullscreenButtonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className={[button, fullscreenButton]}>
        <FullscreenEnterIcon className={[buttonIcon, fullscreenButtonIcon.enter]} />
        <FullscreenExitIcon className={[buttonIcon, fullscreenButtonIcon.exit]} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
