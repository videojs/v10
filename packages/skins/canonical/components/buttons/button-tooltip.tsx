import type { TooltipProps } from '@videojs/core';
import { Tooltip as TooltipPrimitive } from '@videojs/core/components';
import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/popup.tailwind';

export interface ButtonTooltipProps extends TooltipProps {
  children: ComponentNode;
}

export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Popup className={[styles.surface, styles.tooltip]}>
        <TooltipPrimitive.Label />
        <TooltipPrimitive.Shortcut className={styles.tooltipShortcut} />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Root>
  );
}
