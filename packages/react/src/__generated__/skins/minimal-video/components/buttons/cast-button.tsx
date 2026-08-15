import { CastButton as CastButtonPrimitive } from '@/ui/cast-button';
import { CastEnterIcon, CastExitIcon } from '@/icons/minimal';
import { ButtonTooltip } from './button-tooltip';

export function CastButton() {
  return (
    <ButtonTooltip side="top">
      <CastButtonPrimitive className="media-button media-cast-button">
        <CastEnterIcon className="media-button-icon media-cast-enter-icon" />
        <CastExitIcon className="media-button-icon media-cast-exit-icon" />
      </CastButtonPrimitive>
    </ButtonTooltip>
  );
}
