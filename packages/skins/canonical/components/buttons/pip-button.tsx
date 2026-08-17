import { PiPButton as PiPButtonPrimitive } from '@videojs/core/components';
import { PipEnterIcon, PipExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PiPButton() {
  return (
    <ButtonTooltip side="top">
      <PiPButtonPrimitive className={[styles.root, styles.pip]}>
        <PipEnterIcon className={[styles.icon, styles.icons.pipEnter]} />
        <PipExitIcon className={[styles.icon, styles.icons.pipExit]} />
      </PiPButtonPrimitive>
    </ButtonTooltip>
  );
}
