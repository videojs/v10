import { cn } from '@videojs/utils/style';
import { topIndicatorContent, topIndicatorIcon, topIndicatorRoot } from './input-indicator';

export const volumeIndicator = {
  root: cn(topIndicatorRoot, 'data-open:duration-100'),
  content: cn(
    topIndicatorContent,
    'w-[min(80%,--spacing(56))]',
    'group-data-min/input-indicator:animate-media-shake',
    'group-data-max/input-indicator:animate-media-shake',
    'motion-reduce:group-data-min/input-indicator:animate-none',
    'motion-reduce:group-data-max/input-indicator:animate-none'
  ),
  progress: cn(
    '[--media-progress-fill:var(--media-volume-fill)]',
    'w-full h-0.75 rounded-full',
    '[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill),oklch(from_currentColor_l_c_h/0.2)_var(--media-progress-fill),oklch(from_currentColor_l_c_h/0.2)_100%)]',
    'shadow-[0_1px_0_var(--media-current-shadow-color-subtle)]'
  ),
  value: 'ml-auto',
  icon: {
    base: topIndicatorIcon,
    high: 'group-data-[level=high]/input-indicator:block',
    low: 'group-data-[level=low]/input-indicator:block',
    off: 'group-data-[level=off]/input-indicator:block',
  },
};
