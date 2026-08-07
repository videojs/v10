import './styles.css';
import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from './icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function FullscreenButton() {
  return (
    <ButtonTooltip>
      <FullscreenButtonPrimitive className="vjs-button-fullscreen">
        <FullscreenEnterIcon className="vjs-button-icon-fullscreen-enter" />
        <FullscreenExitIcon className="vjs-button-icon-fullscreen-exit" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
