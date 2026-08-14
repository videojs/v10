import { cn } from '@videojs/utils/style';
import { topIndicatorContent, topIndicatorIcon, topIndicatorRoot } from './input-indicator';

export const volumeIndicator = {
  root: cn(topIndicatorRoot, 'data-open:duration-100'),
  content: cn(
    topIndicatorContent,
    'w-[min(80%,--spacing(56))]',
    '[transform:translateX(0)]',
    'motion-safe:group-[:is([data-min],[data-max])]/input-indicator:[transform:translateX(0.25px)]',
    'motion-safe:group-[:is([data-min],[data-max])]/input-indicator:[transition:transform_300ms_linear(0,-24_20%,16_40%,-8_60%,4_80%,1)]'
  ),
  progress: cn(
    'relative w-full h-0.75 rounded-full bg-current/20',
    'before:absolute before:inset-y-0 before:left-0 before:w-(--media-volume-fill,0%) before:content-[""]',
    'before:bg-(--accent-color) before:rounded-[inherit]',
    'before:transition-[width] before:duration-200 before:ease-linear',
    'shadow-[0_1px_0_var(--shadow-subtle-current-color)]'
  ),
  value: 'ml-auto',
  icon: {
    base: topIndicatorIcon,
    high: 'group-data-[level=high]/input-indicator:block',
    low: 'group-data-[level=low]/input-indicator:block',
    off: 'group-data-[level=off]/input-indicator:block',
  },
};
