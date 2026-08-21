import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Tooltip } from '..';
import { MockErrorBoundary } from '../../../testing/mocks';

function Throw(): null {
  throw new Error('abandon render');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TooltipRoot', () => {
  it('keeps a default-open tooltip closed during server rendering', () => {
    const onOpenChange = vi.fn();
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame');
    const readActiveElement = vi.spyOn(Document.prototype, 'activeElement', 'get');

    const html = renderToString(
      <Tooltip.Root defaultOpen onOpenChange={onOpenChange}>
        <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
      </Tooltip.Root>
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
        <Tooltip.Root defaultOpen onOpenChange={onOpenChange}>
          <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
        </Tooltip.Root>
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
        <Tooltip.Root defaultOpen onOpenChange={onOpenChange}>
          <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
        </Tooltip.Root>
      </StrictMode>
    );

    await waitFor(() => expect(getByTestId('popup')).toBeDefined());
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true, expect.any(Object));
  });
});
