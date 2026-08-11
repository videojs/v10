import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className={[styles.button, styles.playButton]}>
        <RestartIcon className={[styles.buttonIcon, styles.restartIcon]} />
        <PlayIcon className={[styles.buttonIcon, styles.playIcon]} />
        <PauseIcon className={[styles.buttonIcon, styles.pauseIcon]} />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
