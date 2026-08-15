import { PiPButton as PiPButtonPrimitive } from '@/ui/pi-pbutton';
import { PipEnterIcon, PipExitIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function PiPButton() {
  return (
    <ButtonTooltip side="top">
      <PiPButtonPrimitive className="media-button media-pip-button">
        <PipEnterIcon className="media-button-icon media-pip-enter-icon" />
        <PipExitIcon className="media-button-icon media-pip-exit-icon" />
      </PiPButtonPrimitive>
    </ButtonTooltip>
  );
}
