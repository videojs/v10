import { FullscreenButton as FullscreenButtonPrimitive } from '@/ui/fullscreen-button';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className="media-button media-fullscreen-button">
        <FullscreenEnterIcon className="media-button-icon media-fullscreen-enter-icon" />
        <FullscreenExitIcon className="media-button-icon media-fullscreen-exit-icon" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
