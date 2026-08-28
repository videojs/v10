import type { TooltipProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren, VjscElement, VjscNode } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/popups/tooltip.styles';

export function ButtonTooltip({
  children,
  label,
  ...props
}: PropsWithChildren<TooltipProps> & { children: VjscElement; label?: VjscNode }) {
  return (
    <$.Tooltip.Root {...props}>
      <$.Tooltip.Trigger>{children}</$.Tooltip.Trigger>
      <$.Tooltip.Popup className={styles.popup}>
        {label ?? <$.Tooltip.Label />}
        {!label && <$.Tooltip.Shortcut className={styles.shortcut} />}
      </$.Tooltip.Popup>
    </$.Tooltip.Root>
  );
}

export const meta = {
  name: 'button-tooltip',
  type: 'component',
  title: 'Button Tooltip',
  description: 'An internal tooltip composition shared by button controls.',
} as const satisfies SkinComponentMeta;
