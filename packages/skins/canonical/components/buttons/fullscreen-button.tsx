import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className={[styles.button, styles.fullscreenButton]}>
        <FullscreenEnterIcon className={[styles.buttonIcon, styles.fullscreenEnterIcon]} />
        <FullscreenExitIcon className={[styles.buttonIcon, styles.fullscreenExitIcon]} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
