import type { TooltipProps } from '@videojs/core';
import * as $ from '@videojs/core/components';
import type { ComponentNode } from 'vjsc/components';
import styles from '../../styles/components/popup.styles';

export interface ButtonTooltipProps extends TooltipProps {
  children: ComponentNode;
}

export function ButtonTooltip({ children, ...props }: ButtonTooltipProps) {
  return (
    <$.Tooltip.Root {...props}>
      <$.Tooltip.Trigger>{children}</$.Tooltip.Trigger>
      <$.Tooltip.Popup className={[styles.surface, styles.tooltip]}>
        <$.Tooltip.Label />
        <$.Tooltip.Shortcut className={styles.shortcut} />
      </$.Tooltip.Popup>
    </$.Tooltip.Root>
  );
}
