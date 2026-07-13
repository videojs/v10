import { cn } from '@videojs/utils/style';
import { surface } from '../components/surface';
import { tooltip as baseTooltip, tooltipShortcut as baseTooltipShortcut } from '../components/tooltip';

export const root = cn(surface, baseTooltip);
export const shortcut = baseTooltipShortcut;
