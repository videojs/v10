import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MockErrorBoundary } from '../../../testing/mocks';
import * as Popover from '../index.parts';

function Throw(): null {
  throw new Error('abandon render');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PopoverRoot', () => {
  it('keeps a default-open popover closed during server rendering', () => {
    const onOpenChange = vi.fn();
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame');
    const readActiveElement = vi.spyOn(Document.prototype, 'activeElement', 'get');

    const html = renderToString(
      <Popover.Root defaultOpen onOpenChange={onOpenChange}>
        <Popover.Popup data-testid="popup">Content</Popover.Popup>
      </Popover.Root>
    );

    expect(html).not.toContain('data-testid');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
    expect(readActiveElement).not.toHaveBeenCalled();
  });

  it('does not open from an abandoned render', () => {
    const onOpenChange = vi.fn();
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame');

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MockErrorBoundary>
        <Popover.Root defaultOpen onOpenChange={onOpenChange}>
          <Popover.Popup data-testid="popup">Content</Popover.Popup>
        </Popover.Root>
        <Throw />
      </MockErrorBoundary>
    );

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('opens once under StrictMode effect replay', async () => {
    const onOpenChange = vi.fn();

    const { getByTestId } = render(
      <StrictMode>
        <Popover.Root defaultOpen onOpenChange={onOpenChange}>
          <Popover.Popup data-testid="popup">Content</Popover.Popup>
        </Popover.Root>
      </StrictMode>
    );

    await waitFor(() => expect(getByTestId('popup')).toBeDefined());
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true, expect.any(Object));
  });
});
