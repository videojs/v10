import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as Popover from '../index.parts';

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Popover', () => {
  it('positions default-open and remounted popups before paint', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === 'trigger')
        return makeDOMRect(this.hasAttribute('data-remounted') ? 200 : 100, 10, 40, 20);
      if (this.dataset.testid === 'popup') return makeDOMRect(0, 0, 100, 60);
      return makeDOMRect(0, 0, 300, 200);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'popup' ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'popup' ? 60 : 0;
    });

    const getPopover = (remounted = false) => (
      <Popover.Root defaultOpen side="top" boundary="viewport">
        <Popover.Trigger
          key={remounted ? 'remounted' : 'initial'}
          data-remounted={remounted ? '' : undefined}
          data-testid="trigger"
        >
          Open
        </Popover.Trigger>
        <Popover.Popup data-testid="popup">
          Content
          <Popover.Arrow data-testid="arrow" />
        </Popover.Popup>
      </Popover.Root>
    );
    const { rerender } = render(getPopover());

    expect(screen.getByTestId('popup').style.top).toBe('30px');

    await waitFor(() => {
      for (const part of ['trigger', 'popup', 'arrow']) {
        expect(screen.getByTestId(part).getAttribute('data-side')).toBe('bottom');
      }
    });

    rerender(getPopover(true));
    expect(screen.getByTestId('popup').style.left).toBe('170px');
  });
});
