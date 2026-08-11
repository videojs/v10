import { cn } from '@videojs/utils/style';
import { topIndicatorContent, topIndicatorRoot } from './input-indicator';

export const volumeIndicator = {
  root: cn(
    topIndicatorRoot,
    'w-[min(80%,--spacing(48))]',
    'data-open:duration-100',
    'data-min:animate-media-shake',
    'data-max:animate-media-shake',
    'motion-reduce:data-min:animate-none',
    'motion-reduce:data-max:animate-none'
  ),
  content: cn(
    topIndicatorContent,
    '[--media-progress-fill:var(--media-volume-fill)]',
    'rounded-[inherit]',
    '[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill),transparent_var(--media-progress-fill),transparent_100%)]',
    '[transition:--media-progress-fill_200ms_linear]'
  ),
  value: 'ml-auto',
  icon: {
    base: 'hidden shrink-0',
    high: 'group-data-[level=high]/input-indicator:block',
    low: 'group-data-[level=low]/input-indicator:block',
    off: 'group-data-[level=off]/input-indicator:block',
  },
};
