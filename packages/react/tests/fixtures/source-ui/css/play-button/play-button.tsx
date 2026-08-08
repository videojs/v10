import './styles.css';
import { PlayButton as PlayButtonPrimitive } from '@videojs/react';
import { PauseIcon, PlayIcon, RestartIcon } from './icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive className="media-button-play">
        <RestartIcon className="media-button-icon-restart" />
        <PlayIcon className="media-button-icon-play" />
        <PauseIcon className="media-button-icon-pause" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
