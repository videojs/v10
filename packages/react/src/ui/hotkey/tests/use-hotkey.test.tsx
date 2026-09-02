import { cleanup, render, waitFor } from '@testing-library/react';
import { findHotkeyCoordinator } from '@videojs/core/dom';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { createMockStore } from '../../../testing/mocks';
import { useHotkey } from '../use-hotkey';

function createContextValue(container: HTMLElement): PlayerContextValue {
  return {
    store: createMockStore() as any,
    media: null,
    setMedia: vi.fn(),
    container,
    setContainer: vi.fn(),
  };
}

function Wrapper({ children, value }: { children: ReactNode; value: PlayerContextValue }) {
  return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
}

function Shortcut({ onActivate }: { onActivate: (event: KeyboardEvent, key: string) => void }): null {
  useHotkey({ keys: 'k', onActivate });
  return null;
}

afterEach(() => {
  cleanup();
});

describe('useHotkey', () => {
  it('calls the latest committed onActivate without re-registering the hotkey', async () => {
    const container = document.createElement('div');
    const value = createContextValue(container);
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = render(
      <Wrapper value={value}>
        <Shortcut onActivate={first} />
      </Wrapper>
    );

    await waitFor(() => expect(findHotkeyCoordinator(container)).toBeDefined());

    rerender(
      <Wrapper value={value}>
        <Shortcut onActivate={second} />
      </Wrapper>
    );

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

    expect(second).toHaveBeenCalledExactlyOnceWith(expect.any(KeyboardEvent), 'k');
    expect(first).not.toHaveBeenCalled();
  });

  it('calls the latest committed onActivate once under StrictMode', async () => {
    const container = document.createElement('div');
    const value = createContextValue(container);
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = render(
      <StrictMode>
        <Wrapper value={value}>
          <Shortcut onActivate={first} />
        </Wrapper>
      </StrictMode>
    );

    await waitFor(() => expect(findHotkeyCoordinator(container)).toBeDefined());

    rerender(
      <StrictMode>
        <Wrapper value={value}>
          <Shortcut onActivate={second} />
        </Wrapper>
      </StrictMode>
    );

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

    expect(second).toHaveBeenCalledExactlyOnceWith(expect.any(KeyboardEvent), 'k');
    expect(first).not.toHaveBeenCalled();
  });
});
