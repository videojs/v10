import { CastButton as CastButtonPrimitive } from '@videojs/core/components';
import { CastEnterIcon, CastExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function CastButton() {
  return (
    <ButtonTooltip side="top">
      <CastButtonPrimitive className={[styles.button, styles.castButton]}>
        <CastEnterIcon className={[styles.buttonIcon, styles.castEnterIcon]} />
        <CastExitIcon className={[styles.buttonIcon, styles.castExitIcon]} />
      </CastButtonPrimitive>
    </ButtonTooltip>
  );
}
