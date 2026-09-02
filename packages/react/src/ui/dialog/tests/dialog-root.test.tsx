import { cleanup, render, waitFor } from '@testing-library/react';
import type { DialogApi } from '@videojs/core/dom';
import { StrictMode, useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Dialog } from '..';
import { MockErrorBoundary } from '../../../testing/mocks';
import { useDialogContext } from '../context';

function Throw(): null {
  throw new Error('abandon render');
}

function CaptureDialog({ onCapture }: { onCapture: (dialog: DialogApi) => void }): null {
  const { dialog } = useDialogContext();

  useLayoutEffect(() => onCapture(dialog), [onCapture, dialog]);

  return null;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DialogRoot', () => {
  it('keeps a default-open dialog closed during server rendering', () => {
    const onOpenChange = vi.fn();
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame');
    const readActiveElement = vi.spyOn(Document.prototype, 'activeElement', 'get');

    const html = renderToString(
      <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Popup data-testid="popup">Content</Dialog.Popup>
      </Dialog.Root>
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
        <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
          <Dialog.Popup data-testid="popup">Content</Dialog.Popup>
        </Dialog.Root>
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
        <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
          <Dialog.Popup>Content</Dialog.Popup>
        </Dialog.Root>
      </StrictMode>
    );

    await waitFor(() => expect(getByRole('dialog')).toBeDefined());
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('keeps the committed onOpenChange when a re-render is abandoned', () => {
    const committed = vi.fn();
    const abandoned = vi.fn();
    let dialog: DialogApi | null = null;
    const capture = (instance: DialogApi) => {
      dialog = instance;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <MockErrorBoundary>
        <Dialog.Root onOpenChange={committed}>
          <CaptureDialog onCapture={capture} />
        </Dialog.Root>
      </MockErrorBoundary>
    );

    rerender(
      <MockErrorBoundary>
        <Dialog.Root onOpenChange={abandoned}>
          <CaptureDialog onCapture={capture} />
        </Dialog.Root>
        <Throw />
      </MockErrorBoundary>
    );

    // The retained dialog outlives the abandoned render and must still call the committed callback.
    dialog!.open();

    expect(committed).toHaveBeenCalledExactlyOnceWith(true);
    expect(abandoned).not.toHaveBeenCalled();
  });
});
