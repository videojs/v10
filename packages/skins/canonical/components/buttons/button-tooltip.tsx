import type { TooltipProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren, VjscElement } from 'vjsc/components';
import styles from '../../styles/components/popup.styles';

export function ButtonTooltip({ children, ...props }: PropsWithChildren<TooltipProps> & { children: VjscElement }) {
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
