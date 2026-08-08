import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import { fullscreenButton, fullscreenButtonIcon } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip.skin';

export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive className={fullscreenButton}>
        <FullscreenEnterIcon className={fullscreenButtonIcon.enter} />
        <FullscreenExitIcon className={fullscreenButtonIcon.exit} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
