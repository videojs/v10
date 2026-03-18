import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createMockStore } from '../../testing/mocks';
import {
  Container,
  PlayerContextProvider,
  type PlayerContextValue,
  useContainerAttach,
  useMedia,
  useMediaAttach,
  useOptionalPlayer,
  usePlayer,
  usePlayerContext,
} from '../context';

function createWrapper(value: PlayerContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
  };
}

function createContextValue(overrides?: Partial<PlayerContextValue>): PlayerContextValue {
  return {
    store: createMockStore() as any,
    media: null,
    setMedia: vi.fn(),
    setContainer: vi.fn(),
    ...overrides,
  };
}

describe('usePlayerContext', () => {
  it('throws outside Provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePlayerContext());
    }).toThrow('usePlayerContext must be used within a Player Provider');

    consoleSpy.mockRestore();
  });

  it('returns context value inside Provider', () => {
    const store = createMockStore();
    const value = createContextValue({ store: store as any });

    const { result } = renderHook(() => usePlayerContext(), {
      wrapper: createWrapper(value),
    });

    expect(result.current.store).toBe(store);
    expect(result.current.media).toBe(null);
  });
});

describe('useMediaAttach', () => {
  it('returns undefined outside Provider', () => {
    const { result } = renderHook(() => useMediaAttach());
    expect(result.current).toBeUndefined();
  });

  it('returns setMedia inside Provider', () => {
    const setMedia = vi.fn();
    const value = createContextValue({ setMedia });

    const { result } = renderHook(() => useMediaAttach(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(setMedia);
  });
});

describe('useContainerAttach', () => {
  it('returns undefined outside Provider', () => {
    const { result } = renderHook(() => useContainerAttach());
    expect(result.current).toBeUndefined();
  });

  it('returns setContainer inside Provider', () => {
    const setContainer = vi.fn();
    const value = createContextValue({ setContainer });

    const { result } = renderHook(() => useContainerAttach(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(setContainer);
  });
});

describe('usePlayer', () => {
  it('returns store without selector', () => {
    const store = createMockStore();
    const value = createContextValue({ store: store as any });

    const { result } = renderHook(() => usePlayer(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(store);
  });
});

describe('useOptionalPlayer', () => {
  it('returns undefined outside Provider', () => {
    const { result } = renderHook(() => useOptionalPlayer());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined outside Provider with selector', () => {
    const { result } = renderHook(() => useOptionalPlayer((state: any) => state.paused));
    expect(result.current).toBeUndefined();
  });

  it('does not run selector outside Provider', () => {
    const selector = vi.fn(() => true);
    const { result } = renderHook(() => useOptionalPlayer(selector));
    expect(result.current).toBeUndefined();
    expect(selector).not.toHaveBeenCalled();
  });

  it('returns store inside Provider', () => {
    const store = createMockStore();
    const value = createContextValue({ store: store as any });

    const { result } = renderHook(() => useOptionalPlayer(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(store);
  });

  it('returns selected state inside Provider', () => {
    const store = createMockStore({ paused: true });
    const value = createContextValue({ store: store as any });

    const { result } = renderHook(() => useOptionalPlayer((state: any) => state.paused), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(true);
  });
});

describe('useMedia', () => {
  it('returns media from context', () => {
    const media = document.createElement('video');
    const value = createContextValue({ media });

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(media);
  });

  it('returns null when no media', () => {
    const value = createContextValue();

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBeNull();
  });
});

describe('Container', () => {
  it('renders children', () => {
    const value = createContextValue();

    const { container } = render(
      <PlayerContextProvider value={value}>
        <Container>
          <span>test</span>
        </Container>
      </PlayerContextProvider>
    );

    expect(container.querySelector('span')).toBeTruthy();
  });

  it('registers container element via setContainer', () => {
    const setContainer = vi.fn();
    const value = createContextValue({ setContainer });

    render(
      <PlayerContextProvider value={value}>
        <Container />
      </PlayerContextProvider>
    );

    expect(setContainer).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('deregisters container on unmount', () => {
    const setContainer = vi.fn();
    const value = createContextValue({ setContainer });

    const { unmount } = render(
      <PlayerContextProvider value={value}>
        <Container />
      </PlayerContextProvider>
    );

    setContainer.mockClear();
    unmount();

    expect(setContainer).toHaveBeenCalledWith(null);
  });

  it('does not call store.attach directly', () => {
    const store = createMockStore();
    const media = document.createElement('video');
    const value = createContextValue({ store: store as any, media });

    render(
      <PlayerContextProvider value={value}>
        <Container />
      </PlayerContextProvider>
    );

    expect(store.attach).not.toHaveBeenCalled();
  });
});
