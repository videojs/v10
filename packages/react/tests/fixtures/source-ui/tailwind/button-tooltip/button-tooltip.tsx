import '../styles/tailwind.css';
import { Tooltip as TooltipPrimitive } from '@videojs/react';
import type { ReactElement } from 'react';
export type ButtonTooltipProps = Omit<Parameters<typeof TooltipPrimitive.Root>[0], 'children'> & {
  children: ReactElement;
};
export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Popup className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface m-0 whitespace-nowrap rounded-media-pill border-0 px-2.5 py-[0.35rem] data-open:flex data-open:items-center data-open:gap-1">
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut className="text-[0.75em] font-semibold" />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
