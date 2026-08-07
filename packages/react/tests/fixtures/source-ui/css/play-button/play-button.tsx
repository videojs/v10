import './styles.css';
import { PlayButton as PlayButtonPrimitive } from '@videojs/react';
import { PauseIcon, PlayIcon, RestartIcon } from './icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive className="vjs-button-play">
        <RestartIcon className="vjs-button-icon-restart" />
        <PlayIcon className="vjs-button-icon-play" />
        <PauseIcon className="vjs-button-icon-pause" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
