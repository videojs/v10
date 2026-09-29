import * as $ from '@videojs/core/vjsc';
import {
  CastEnterIcon,
  CastExitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PipEnterIcon,
  PipExitIcon,
} from '@videojs/icons/vjsc';

import { Button } from './button';
import { ButtonTooltip } from './components';
import styles from './skin.styles';

function CastButton() {
  return (
    <ButtonTooltip popupClassName={styles.screenTooltipPopup}>
      <$.CastButton $render={Button} className={styles.castGroup}>
        <CastEnterIcon className={[styles.icon, styles.castEnterIcon]} />
        <CastExitIcon className={[styles.icon, styles.castExitIcon]} />
      </$.CastButton>
    </ButtonTooltip>
  );
}

function PiPButton() {
  return (
    <ButtonTooltip popupClassName={styles.screenTooltipPopup}>
      <$.PiPButton $render={Button} className={styles.pipGroup}>
        <PipEnterIcon className={[styles.icon, styles.pipEnterIcon]} />
        <PipExitIcon className={[styles.icon, styles.pipExitIcon]} />
      </$.PiPButton>
    </ButtonTooltip>
  );
}

function FullscreenButton() {
  return (
    <ButtonTooltip popupClassName={styles.screenTooltipPopup}>
      <$.FullscreenButton $render={Button} className={styles.fullscreenGroup}>
        <FullscreenEnterIcon className={[styles.icon, styles.enterFullscreenIcon]} />
        <FullscreenExitIcon className={[styles.icon, styles.exitFullscreenIcon]} />
      </$.FullscreenButton>
    </ButtonTooltip>
  );
}

export function ScreenControls() {
  return (
    <$.Controls.Group className={styles.controlsTop}>
      <CastButton />
      <PiPButton />
      <FullscreenButton />
    </$.Controls.Group>
  );
}
