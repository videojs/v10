import './styles.css';
import { Tooltip as TooltipPrimitive } from '@videojs/react';
import type { ReactElement } from 'react';
export type ButtonTooltipProps = Omit<Parameters<typeof TooltipPrimitive.Root>[0], 'children'> & {
  children: ReactElement;
};
export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Popup className="vjs-tooltip-popup">
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut className="vjs-tooltip-shortcut" />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
