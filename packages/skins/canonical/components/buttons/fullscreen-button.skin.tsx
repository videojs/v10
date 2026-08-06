import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import { ButtonTooltip } from './button-tooltip.skin';

export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive>
        <FullscreenEnterIcon />
        <FullscreenExitIcon />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
