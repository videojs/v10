import { Tooltip as TooltipPrimitive } from '@/ui/tooltip';
import type { ReactElement } from 'react';

export interface ButtonTooltipProps extends TooltipPrimitive.RootProps {
  children: ReactElement;
}

export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Popup className="media-surface media-tooltip">
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut className="media-tooltip-shortcut" />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
