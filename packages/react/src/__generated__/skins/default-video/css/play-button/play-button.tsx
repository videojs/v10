import './styles.css';
import { PlayButton as PlayButtonPrimitive } from '@videojs/react';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function PlayButton() {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive className="media-play-button">
        <RestartIcon className="media-play-button-icon-restart" />
        <PlayIcon className="media-play-button-icon-play" />
        <PauseIcon className="media-play-button-icon-pause" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
