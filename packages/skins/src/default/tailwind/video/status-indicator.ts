import { cn } from '@videojs/utils/style';
import {
  statusIndicatorTop as baseStatusIndicatorTop,
  statusIndicatorCaptionsOffIcon,
  statusIndicatorCaptionsOnIcon,
  statusIndicatorCenter,
  statusIndicatorCenterIcon,
  statusIndicatorFullscreenEnterIcon,
  statusIndicatorFullscreenExitIcon,
  statusIndicatorPauseIcon,
  statusIndicatorPipEnterIcon,
  statusIndicatorPipExitIcon,
  statusIndicatorPlayIcon,
  statusIndicatorTopIcon,
} from '../components/indicators';
import { surface } from '../components/surface';

export const top = cn(baseStatusIndicatorTop, surface);
export const center = statusIndicatorCenter;
export const topIcon = statusIndicatorTopIcon;
export const centerIcon = statusIndicatorCenterIcon;
export const captionsOnIcon = statusIndicatorCaptionsOnIcon;
export const captionsOffIcon = statusIndicatorCaptionsOffIcon;
export const fullscreenEnterIcon = statusIndicatorFullscreenEnterIcon;
export const fullscreenExitIcon = statusIndicatorFullscreenExitIcon;
export const pipEnterIcon = statusIndicatorPipEnterIcon;
export const pipExitIcon = statusIndicatorPipExitIcon;
export const playIcon = statusIndicatorPlayIcon;
export const pauseIcon = statusIndicatorPauseIcon;
