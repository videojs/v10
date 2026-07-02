import { render, waitFor } from '@testing-library/react';
import { popup } from '@videojs/skins/default/tailwind/video.tailwind';
import { useLayoutEffect } from 'react';
import { describe, expect, it } from 'vitest';

import { Tooltip, useOptionalTooltipContext } from '..';

function TooltipContent({ label, shortcut }: { label?: string; shortcut?: string }) {
  const tooltip = useOptionalTooltipContext();
  const setContent = tooltip?.setContent;

  useLayoutEffect(() => {
    setContent?.({ label, shortcut });
    return () => setContent?.(undefined);
  }, [setContent, label, shortcut]);

  return null;
}

describe('Tooltip', () => {
  it('renders label and kbd shortcut with skin popup.tooltipShortcut from context', async () => {
    const { container } = render(
      <Tooltip.Root defaultOpen>
        <TooltipContent label="Play" shortcut="K" />
        <Tooltip.Popup data-testid="popup">
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="popup"] span')?.textContent).toBe('Play');
      const hint = container.querySelector('[data-testid="popup"] kbd');
      expect(hint?.textContent).toBe('K');
      expect(hint?.localName).toBe('kbd');
    });
    expect(container.querySelector('[data-testid="popup"] span')?.getAttribute('class')).toBeNull();
  });

  it('omits shortcut without a shortcut value', async () => {
    const { container } = render(
      <Tooltip.Root defaultOpen>
        <TooltipContent label="Play" />
        <Tooltip.Popup data-testid="popup">
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );

    await waitFor(() => expect(container.querySelector('[data-testid="popup"] span')?.textContent).toBe('Play'));
    expect(container.querySelector('[data-testid="popup"] kbd')).toBeNull();
  });

  it('passes TooltipState to custom popup render functions', async () => {
    const { container } = render(
      <Tooltip.Root defaultOpen>
        <TooltipContent label="Play" shortcut="K" />
        <Tooltip.Popup
          render={(props, state) => (
            <div {...props} data-open={String(state.open)} data-side={state.side} data-testid="popup">
              <Tooltip.Label />
              <Tooltip.Shortcut className={popup.tooltipShortcut} />
            </div>
          )}
        />
      </Tooltip.Root>
    );

    await waitFor(() =>
      expect(container.querySelector('[data-testid="popup"]')?.getAttribute('data-open')).toBe('true')
    );
    expect(container.querySelector('[data-testid="popup"]')?.getAttribute('data-side')).toBe('top');
  });
});
