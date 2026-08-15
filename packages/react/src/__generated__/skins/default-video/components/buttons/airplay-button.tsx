import { AirPlayButton as AirPlayButtonPrimitive } from '@/ui/air-play-button';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function AirPlayButton() {
  return (
    <ButtonTooltip side="top">
      <AirPlayButtonPrimitive className="media-button media-airplay-button">
        <AirPlayEnterIcon className="media-button-icon media-airplay-enter-icon" />
        <AirPlayExitIcon className="media-button-icon media-airplay-exit-icon" />
      </AirPlayButtonPrimitive>
    </ButtonTooltip>
  );
}
