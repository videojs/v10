import { cn } from '@videojs/utils/style';
import { topIndicatorContent, topIndicatorRoot } from './input-indicator';

export const volumeIndicator = {
  root: cn(
    topIndicatorRoot,
    'w-[min(80%,--spacing(48))]',
    'data-open:duration-100',
    '[transform:translateX(0)]',
    'motion-safe:[&:is([data-min],[data-max])]:[transform:translateX(0.25px)]',
    'motion-safe:[&:is([data-min],[data-max])]:[transition:transform_300ms_linear(0,-24_20%,16_40%,-8_60%,4_80%,1)]'
  ),
  content: cn(
    topIndicatorContent,
    'rounded-[inherit]',
    'bg-left bg-no-repeat',
    '[background-image:linear-gradient(currentColor,currentColor)]',
    '[background-size:var(--media-volume-fill,0%)_100%]',
    'transition-[background-size] duration-200 ease-linear'
  ),
  value: 'ml-auto',
  icon: {
    base: 'hidden shrink-0',
    high: 'group-data-[level=high]/input-indicator:block',
    low: 'group-data-[level=low]/input-indicator:block',
    off: 'group-data-[level=off]/input-indicator:block',
  },
};
