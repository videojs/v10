import { vi } from 'vitest';
import { createPopover, type PopoverChangeDetails } from '../popover';

export function createTestPopover(overrides?: Partial<Parameters<typeof createPopover>[0]>) {
  const onOpenChange = vi.fn<(open: boolean, details: PopoverChangeDetails) => void>();
  const popover = createPopover({
    onOpenChange,
    closeOnEscape: () => true,
    closeOnOutsideClick: () => true,
    ...overrides,
  });
  return { popover, onOpenChange };
}
