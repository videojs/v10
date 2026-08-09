import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';
import { ButtonTooltip } from './button-tooltip';
export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className="media-button media-fullscreen-button">
        <FullscreenEnterIcon className="media-button-icon media-fullscreen-button-icon-enter" />
        <FullscreenExitIcon className="media-button-icon media-fullscreen-button-icon-exit" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
