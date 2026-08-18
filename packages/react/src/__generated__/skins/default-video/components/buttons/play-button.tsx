import { PlayButton as PlayButtonPrimitive } from '@/ui/play-button';
import { PauseIcon, PlayIcon, RestartIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className="media-button media-play-button">
        <RestartIcon className="media-button-icon media-restart-icon" />
        <PlayIcon className="media-button-icon media-play-icon" />
        <PauseIcon className="media-button-icon media-pause-icon" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
