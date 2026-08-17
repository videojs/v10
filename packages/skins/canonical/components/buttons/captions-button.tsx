import * as $ from '@videojs/core/components';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CaptionsButton() {
  return (
    <ButtonTooltip side="top">
      <$.CaptionsButton className={[styles.root, styles.captions]}>
        <CaptionsOffIcon className={[styles.icon, styles.icons.captionsOff]} />
        <CaptionsOnIcon className={[styles.icon, styles.icons.captionsOn]} />
      </$.CaptionsButton>
    </ButtonTooltip>
  );
}
