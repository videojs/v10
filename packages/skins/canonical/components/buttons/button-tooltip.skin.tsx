import { Tooltip as TooltipPrimitive } from '@videojs/core/components';

export function ButtonTooltip({ children, ...props }: Parameters<typeof TooltipPrimitive.Root>[0]) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Popup>
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
