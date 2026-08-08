import './styles.css';
import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive } from '@videojs/react';
import { SeekIcon } from './icons';
import { ButtonTooltip } from '../button-tooltip/button-tooltip';
export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip>
      <SeekButtonPrimitive className="media-button-seek" {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? 'media-button-icon-seek-backward' : 'media-button-icon-seek-forward'} />
        <span className="media-seek-label">{Math.abs(seconds)}</span>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}
