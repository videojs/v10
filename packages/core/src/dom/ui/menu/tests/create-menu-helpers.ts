import { vi } from 'vitest';
import { createTransition } from '../../transition';
import { createMenu, type MenuChangeDetails } from '../create-menu';

export function createTestMenu(overrides?: Partial<Parameters<typeof createMenu>[0]>) {
  const onOpenChange = vi.fn<(open: boolean, details: MenuChangeDetails) => void>();
  const onHighlightChange = vi.fn<(element: HTMLElement | null) => void>();
  const transition = overrides?.transition ?? createTransition();

  const menu = createMenu({
    transition,
    onOpenChange,
    closeOnEscape: () => true,
    closeOnOutsideClick: () => true,
    onHighlightChange,
    ...overrides,
  });

  return { menu, onOpenChange, onHighlightChange, transition };
}

export function createItemElement(text: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.textContent = text;
  document.body.appendChild(element);
  return element;
}

export function cleanupElement(element: HTMLElement): void {
  element.remove();
}
