import './styles.css';
import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive } from '@videojs/react';
import { SeekIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip>
      <SeekButtonPrimitive className="media-seek-button" {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? 'media-seek-button-icon-backward' : 'media-seek-button-icon-forward'} />
        <span className="media-seek-button-label">{Math.abs(seconds)}</span>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}
