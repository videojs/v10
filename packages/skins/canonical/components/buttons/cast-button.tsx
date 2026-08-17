import * as $ from '@videojs/core/components';
import { CastEnterIcon, CastExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CastButton() {
  return (
    <ButtonTooltip side="top">
      <$.CastButton className={[styles.root, styles.cast]}>
        <CastEnterIcon className={[styles.icon, styles.icons.castEnter]} />
        <CastExitIcon className={[styles.icon, styles.icons.castExit]} />
      </$.CastButton>
    </ButtonTooltip>
  );
}
