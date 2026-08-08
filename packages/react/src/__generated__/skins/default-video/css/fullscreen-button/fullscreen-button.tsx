import './styles.css';
import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive className="media-fullscreen-button">
        <FullscreenEnterIcon className="media-fullscreen-button-icon-enter" />
        <FullscreenExitIcon className="media-fullscreen-button-icon-exit" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
