import { vi } from 'vitest';
import { createTransition } from '../../transition';
import { createTooltip, type TooltipChangeDetails, type TooltipOptions } from '../tooltip';

export function createTestTooltip(overrides?: Partial<TooltipOptions>) {
  const onOpenChange = vi.fn<(open: boolean, details: TooltipChangeDetails) => void>();
  const transition = overrides?.transition ?? createTransition();
  const tooltip = createTooltip({
    transition,
    onOpenChange,
    ...overrides,
  });
  return { tooltip, onOpenChange, transition };
}
