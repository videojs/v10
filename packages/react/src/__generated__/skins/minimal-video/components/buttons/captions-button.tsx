import { CaptionsButton as CaptionsButtonPrimitive } from '@/ui/captions-button';
import { CaptionsOffIcon, CaptionsOnIcon } from '@/icons/minimal';
import { ButtonTooltip } from './button-tooltip';

export function CaptionsButton() {
  return (
    <ButtonTooltip side="top">
      <CaptionsButtonPrimitive className="media-button media-captions-button">
        <CaptionsOffIcon className="media-button-icon media-captions-off-icon" />
        <CaptionsOnIcon className="media-button-icon media-captions-on-icon" />
      </CaptionsButtonPrimitive>
    </ButtonTooltip>
  );
}
