import { vi } from 'vitest';
import { createTransitionHandler } from '../../transition';
import { createPopover, type PopoverChangeDetails } from '../popover';

export function createTestPopover(overrides?: Partial<Parameters<typeof createPopover>[0]>) {
  const onOpenChange = vi.fn<(open: boolean, details: PopoverChangeDetails) => void>();
  const transition = overrides?.transition ?? createTransitionHandler();
  const popover = createPopover({
    transition,
    onOpenChange,
    closeOnEscape: () => true,
    closeOnOutsideClick: () => true,
    ...overrides,
  });
  return { popover, onOpenChange, transition };
}
