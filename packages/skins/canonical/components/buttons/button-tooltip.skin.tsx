import { Tooltip as TooltipPrimitive } from '@videojs/core/components';
import type { ComponentNode as ReactElement } from '@videojs/jsx';
import { tooltip } from '../../styles/components/popup.tailwind';

export type ButtonTooltipProps = Omit<Parameters<typeof TooltipPrimitive.Root>[0], 'children'> & {
  children: ReactElement;
};

export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
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
