import { cn } from '@videojs/utils/style';
import {
  volumeIndicator as baseVolumeIndicator,
  volumeIndicatorHighIcon,
  volumeIndicatorIcon,
  volumeIndicatorLowIcon,
  volumeIndicatorOffIcon,
} from '../components/indicators';
import { surface } from '../components/surface';

export const root = cn(baseVolumeIndicator, surface);
export const icon = volumeIndicatorIcon;
export const highIcon = volumeIndicatorHighIcon;
export const lowIcon = volumeIndicatorLowIcon;
export const offIcon = volumeIndicatorOffIcon;
