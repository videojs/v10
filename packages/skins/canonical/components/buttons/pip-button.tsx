import { PiPButton as PiPButtonPrimitive } from '@videojs/core/components';
import { PipEnterIcon, PipExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function PiPButton() {
  return (
    <ButtonTooltip side="top">
      <PiPButtonPrimitive className={[styles.button, styles.pipButton]}>
        <PipEnterIcon className={[styles.buttonIcon, styles.pipEnterIcon]} />
        <PipExitIcon className={[styles.buttonIcon, styles.pipExitIcon]} />
      </PiPButtonPrimitive>
    </ButtonTooltip>
  );
}
