import * as $ from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <$.PlayButton className={[styles.root, styles.play]}>
        <RestartIcon className={[styles.icon, styles.icons.restart]} />
        <PlayIcon className={[styles.icon, styles.icons.play]} />
        <PauseIcon className={[styles.icon, styles.icons.pause]} />
      </$.PlayButton>
    </ButtonTooltip>
  );
}
