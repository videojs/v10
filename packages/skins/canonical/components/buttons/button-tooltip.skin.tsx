import { Tooltip as TooltipPrimitive } from '@videojs/core/components';
import { tooltip } from '../../styles/components/popup.tailwind';

export function ButtonTooltip({ children, ...props }: Parameters<typeof TooltipPrimitive.Root>[0]) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Popup className={tooltip.popup}>
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut className={tooltip.shortcut} />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
