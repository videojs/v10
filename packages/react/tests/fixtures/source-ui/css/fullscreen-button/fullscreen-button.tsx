import './styles.css';
import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from './icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive className="media-button-fullscreen">
        <FullscreenEnterIcon className="media-button-icon-fullscreen-enter" />
        <FullscreenExitIcon className="media-button-icon-fullscreen-exit" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
