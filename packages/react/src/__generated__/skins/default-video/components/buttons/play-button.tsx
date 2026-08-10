import { PlayButton as PlayButtonPrimitive } from '@/ui/play-button';
import { PauseIcon, PlayIcon, RestartIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className="media-button media-play-button">
        <RestartIcon className="media-button-icon media-play-button-icon-restart" />
        <PlayIcon className="media-button-icon media-play-button-icon-play" />
        <PauseIcon className="media-button-icon media-play-button-icon-pause" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
