import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { PopoverApi } from '@videojs/core/dom';
import { StrictMode, useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MockErrorBoundary } from '../../../testing/mocks';
import { usePopoverContext } from '../context';
import * as Popover from '../index.parts';

function Throw(): null {
  throw new Error('abandon render');
}

function CapturePopover({ onCapture }: { onCapture: (popover: PopoverApi) => void }): null {
  const { popover } = usePopoverContext();

  useLayoutEffect(() => onCapture(popover), [onCapture, popover]);

  return null;
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

  it('keeps the committed onOpenChange when a re-render is abandoned', () => {
    const committed = vi.fn();
    const abandoned = vi.fn();
    let popover: PopoverApi | null = null;
    const capture = (instance: PopoverApi) => {
      popover = instance;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <MockErrorBoundary>
        <Popover.Root onOpenChange={committed}>
          <CapturePopover onCapture={capture} />
        </Popover.Root>
      </MockErrorBoundary>
    );

    rerender(
      <MockErrorBoundary>
        <Popover.Root onOpenChange={abandoned}>
          <CapturePopover onCapture={capture} />
        </Popover.Root>
        <Throw />
      </MockErrorBoundary>
    );

    // The retained popover outlives the abandoned render and must still call the committed callback.
    popover!.open('click');

    expect(committed).toHaveBeenCalledExactlyOnceWith(true, { reason: 'click' });
    expect(abandoned).not.toHaveBeenCalled();
  });

  it('calls the latest committed onOpenChange under StrictMode', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender, getByTestId } = render(
      <StrictMode>
        <Popover.Root onOpenChange={first}>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        </Popover.Root>
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <Popover.Root onOpenChange={second}>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        </Popover.Root>
      </StrictMode>
    );

    fireEvent.click(getByTestId('trigger'));

    expect(second).toHaveBeenCalledExactlyOnceWith(true, expect.objectContaining({ reason: 'click' }));
    expect(first).not.toHaveBeenCalled();
  });
});
