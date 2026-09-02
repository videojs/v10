import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { AlertDialog } from '..';
import { MockErrorBoundary } from '../../../testing/mocks';

function Throw(): null {
  throw new Error('abandon render');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AlertDialogRoot', () => {
  it('keeps a default-open alert dialog closed during server rendering', () => {
    const onOpenChange = vi.fn();
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame');
    const readActiveElement = vi.spyOn(Document.prototype, 'activeElement', 'get');

    const html = renderToString(
      <AlertDialog.Root defaultOpen onOpenChange={onOpenChange}>
        <AlertDialog.Popup data-testid="popup">Content</AlertDialog.Popup>
      </AlertDialog.Root>
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
        <AlertDialog.Root defaultOpen onOpenChange={onOpenChange}>
          <AlertDialog.Popup data-testid="popup">Content</AlertDialog.Popup>
        </AlertDialog.Root>
        <Throw />
      </MockErrorBoundary>
    );

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('opens once under StrictMode effect replay', async () => {
    const onOpenChange = vi.fn();

    const { getByRole } = render(
      <StrictMode>
        <AlertDialog.Root defaultOpen onOpenChange={onOpenChange}>
          <AlertDialog.Popup>Content</AlertDialog.Popup>
        </AlertDialog.Root>
      </StrictMode>
    );

    await waitFor(() => expect(getByRole('alertdialog')).toBeDefined());
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
  });
});
