import { cleanup, render, waitFor } from '@testing-library/react';
import type { TooltipApi } from '@videojs/core/dom';
import { StrictMode, useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Tooltip } from '..';
import { MockErrorBoundary } from '../../../testing/mocks';
import { useTooltipContext } from '../context';

function Throw(): null {
  throw new Error('abandon render');
}

function CaptureTooltip({ onCapture }: { onCapture: (tooltip: TooltipApi) => void }): null {
  const { tooltip } = useTooltipContext();

  useLayoutEffect(() => onCapture(tooltip), [onCapture, tooltip]);

  return null;
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

  it('keeps the committed onOpenChange when a re-render is abandoned', () => {
    const committed = vi.fn();
    const abandoned = vi.fn();
    let tooltip: TooltipApi | null = null;
    const capture = (instance: TooltipApi) => {
      tooltip = instance;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <MockErrorBoundary>
        <Tooltip.Root onOpenChange={committed}>
          <CaptureTooltip onCapture={capture} />
        </Tooltip.Root>
      </MockErrorBoundary>
    );

    rerender(
      <MockErrorBoundary>
        <Tooltip.Root onOpenChange={abandoned}>
          <CaptureTooltip onCapture={capture} />
        </Tooltip.Root>
        <Throw />
      </MockErrorBoundary>
    );

    // The retained tooltip outlives the abandoned render and must still call the committed callback.
    tooltip!.open();

    expect(committed).toHaveBeenCalledExactlyOnceWith(true, { reason: 'hover' });
    expect(abandoned).not.toHaveBeenCalled();
  });
});
