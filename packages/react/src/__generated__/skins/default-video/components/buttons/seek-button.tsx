import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive } from '@/ui/seek-button';
import { SeekIcon } from '@/icons';
import { ButtonTooltip } from './button-tooltip';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip side="top">
      <SeekButtonPrimitive className="media-button media-seek-button" {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? 'media-button-icon media-seek-backward-icon' : 'media-button-icon'} />
        <span className="media-seek-button-label">{Math.abs(seconds)}</span>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}
