import { PlayButton as PlayButtonPrimitive } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className={[styles.root, styles.play]}>
        <RestartIcon className={[styles.icon, styles.icons.restart]} />
        <PlayIcon className={[styles.icon, styles.icons.play]} />
        <PauseIcon className={[styles.icon, styles.icons.pause]} />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
