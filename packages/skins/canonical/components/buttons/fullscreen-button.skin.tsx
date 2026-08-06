import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import { Tooltip } from '../overlays/tooltip.skin';

export function FullscreenButton() {
  return (
    <Tooltip>
      <FullscreenButtonPrimitive>
        <FullscreenEnterIcon />
        <FullscreenExitIcon />
      </FullscreenButtonPrimitive>
    </Tooltip>
  );
}
