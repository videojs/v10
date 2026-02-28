import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createMockStore } from '../../testing/mocks';
import {
  Container,
  PlayerContextProvider,
  type PlayerContextValue,
  useMedia,
  useMediaRegistration,
  useOptionalPlayer,
  usePlayer,
  usePlayerContext,
} from '../context';

function createWrapper(value: PlayerContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
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
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    const { result } = renderHook(() => usePlayerContext(), {
      wrapper: createWrapper(value),
    });

    expect(result.current.store).toBe(store);
    expect(result.current.media).toBe(null);
  });
});

describe('useMediaRegistration', () => {
  it('returns undefined outside Provider', () => {
    const { result } = renderHook(() => useMediaRegistration());
    expect(result.current).toBeUndefined();
  });

  it('returns setMedia inside Provider', () => {
    const setMedia = vi.fn();
    const store = createMockStore();
    const value: PlayerContextValue = { store: store as any, media: null, setMedia };

    const { result } = renderHook(() => useMediaRegistration(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(setMedia);
  });
});

describe('usePlayer', () => {
  it('returns store without selector', () => {
    const store = createMockStore();
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

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
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    const { result } = renderHook(() => useOptionalPlayer(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(store);
  });

  it('returns selected state inside Provider', () => {
    const store = createMockStore({ paused: true });
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    const { result } = renderHook(() => useOptionalPlayer((state: any) => state.paused), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(true);
  });
});

describe('useMedia', () => {
  it('returns media from context', () => {
    const store = createMockStore();
    const media = document.createElement('video');
    const value: PlayerContextValue = { store: store as any, media, setMedia: vi.fn() };

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBe(media);
  });

  it('returns null when no media', () => {
    const store = createMockStore();
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    const { result } = renderHook(() => useMedia(), {
      wrapper: createWrapper(value),
    });

    expect(result.current).toBeNull();
  });
});

describe('Container', () => {
  it('renders children', () => {
    const store = createMockStore();
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    const { container } = render(
      <PlayerContextProvider value={value}>
        <Container>
          <span>test</span>
        </Container>
      </PlayerContextProvider>
    );

    expect(container.querySelector('span')).toBeTruthy();
  });

  it('attaches media to store when media is set', () => {
    const store = createMockStore();
    const media = document.createElement('video');
    const value: PlayerContextValue = { store: store as any, media, setMedia: vi.fn() };

    render(
      <PlayerContextProvider value={value}>
        <Container />
      </PlayerContextProvider>
    );

    expect(store.attach).toHaveBeenCalledWith({
      media,
      container: expect.any(HTMLDivElement),
    });
  });

  it('does not attach when media is null', () => {
    const store = createMockStore();
    const value: PlayerContextValue = { store: store as any, media: null, setMedia: vi.fn() };

    render(
      <PlayerContextProvider value={value}>
        <Container />
      </PlayerContextProvider>
    );

    expect(store.attach).not.toHaveBeenCalled();
  });
});
