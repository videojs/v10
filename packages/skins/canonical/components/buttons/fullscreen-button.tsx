import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className={[styles.root, styles.fullscreen]}>
        <FullscreenEnterIcon className={[styles.icon, styles.icons.fullscreenEnter]} />
        <FullscreenExitIcon className={[styles.icon, styles.icons.fullscreenExit]} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
