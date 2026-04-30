import { render, waitFor } from '@testing-library/react';
import { popup } from '@videojs/skins/default/tailwind/video.tailwind';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { createMockStore } from '../../../testing/mocks';
import { Hotkey } from '../../hotkey/hotkey';
import { Tooltip } from '../../tooltip';
import { PlaybackRateButton } from '../playback-rate-button';

function createContextValue(container: HTMLElement): PlayerContextValue {
  return {
    store: createMockStore({
      playbackRates: [0.5, 1, 1.5, 2],
      playbackRate: 1,
      setPlaybackRate: vi.fn(),
    }) as any,
    media: null,
    setMedia: vi.fn(),
    container,
    setContainer: vi.fn(),
  };
}

function Wrapper({ children, value }: { children: ReactNode; value: PlayerContextValue }) {
  return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
}

describe('PlaybackRateButton', () => {
  it('uses the core label and the speed-up shortcut', async () => {
    const container = document.createElement('div');
    const value = createContextValue(container);

    render(
      <Wrapper value={value}>
        <Tooltip.Root defaultOpen>
          <Tooltip.Trigger render={<PlaybackRateButton data-testid="button" />} />
          <Tooltip.Popup data-testid="popup">
            <Tooltip.Label />
            <Tooltip.Shortcut className={popup.tooltipShortcut} />
          </Tooltip.Popup>
        </Tooltip.Root>
        <Hotkey keys=">" action="speedUp" />
        <Hotkey keys="<" action="speedDown" />
      </Wrapper>
    );

    const button = document.querySelector('[data-testid="button"]');

    await waitFor(() => {
      expect(document.querySelector('[data-testid="popup"] span')?.textContent).toBe('Playback speed');
      expect(document.querySelector('[data-testid="popup"] kbd')?.textContent).toBe('>');
    });
    expect(button?.getAttribute('role')).toBe('spinbutton');
    expect(button?.getAttribute('aria-label')).toBe('Playback speed');
    expect(button?.getAttribute('aria-valuenow')).toBe('1');
    expect(button?.getAttribute('aria-valuetext')).toBe('1×');
    expect(button?.getAttribute('aria-valuemin')).toBe('0.5');
    expect(button?.getAttribute('aria-valuemax')).toBe('2');
    expect(button?.getAttribute('aria-keyshortcuts')).toBe('>');
  });
});
