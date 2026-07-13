import { cn } from '@videojs/utils/style';
import {
  airplayIcon as baseAirplayIcon,
  captionsIcon as baseCaptionsIcon,
  castIcon as baseCastIcon,
  fullscreenIcon as baseFullscreenIcon,
  muteIcon as baseMuteIcon,
  pipIcon as basePipIcon,
  playIcon as basePlayIcon,
} from '../../../shared/tailwind/icon-state';

export const icon = cn(
  'block [grid-area:1/1] size-(--media-icon-size) shrink-0',
  'drop-shadow-[0_1px_0_var(--media-current-shadow-color)]',
  'transition-discrete transition-[display,opacity] duration-150 ease-out'
);

export const iconHidden = 'hidden opacity-0';
export const iconFlipped = '[scale:-1_1]';
export const iconContainer = 'relative grid';

export const root = icon;
export const hidden = iconHidden;
export const flipped = iconFlipped;
export const container = iconContainer;

export const playButtonState = basePlayIcon.button;
export const restartIcon = basePlayIcon.restart;
export const playIcon = basePlayIcon.play;
export const pauseIcon = basePlayIcon.pause;

export const muteButtonState = baseMuteIcon.button;
export const volumeOffIcon = baseMuteIcon.volumeOff;
export const volumeLowIcon = baseMuteIcon.volumeLow;
export const volumeHighIcon = baseMuteIcon.volumeHigh;

export const castButtonState = baseCastIcon.button;
export const castEnterIcon = baseCastIcon.enter;
export const castExitIcon = baseCastIcon.exit;

export const airplayButtonState = baseAirplayIcon.button;
export const airplayEnterIcon = baseAirplayIcon.enter;
export const airplayExitIcon = baseAirplayIcon.exit;

export const pipButtonState = basePipIcon.button;
export const pipEnterIcon = basePipIcon.off;
export const pipExitIcon = basePipIcon.on;

export const fullscreenButtonState = baseFullscreenIcon.button;
export const fullscreenEnterIcon = baseFullscreenIcon.enter;
export const fullscreenExitIcon = baseFullscreenIcon.exit;

export const captionsButtonState = baseCaptionsIcon.button;
export const captionsOffIcon = baseCaptionsIcon.off;
export const captionsOnIcon = baseCaptionsIcon.on;

export const seekBackwardIcon = iconFlipped;
