import * as $ from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <$.FullscreenButton className={[styles.root, styles.fullscreen]}>
        <FullscreenEnterIcon className={[styles.icon, styles.icons.fullscreenEnter]} />
        <FullscreenExitIcon className={[styles.icon, styles.icons.fullscreenExit]} />
      </$.FullscreenButton>
    </ButtonTooltip>
  );
}
