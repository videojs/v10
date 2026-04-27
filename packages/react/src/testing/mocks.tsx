/**
 * Shared test helpers for `@videojs/react`.
 *
 * Provides factory functions for common mock objects used across component
 * tests. `vi.mock()` blocks must still live in each test file (Vitest hoists
 * them before imports), but non-mock helpers like store and wrapper factories
 * can be shared here.
 */

import type { ReactNode } from 'react';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { PlayerContextProvider, type PlayerContextValue } from '../player/context';

interface MockStore {
  state: Record<string, unknown>;
  attach: Mock<() => Mock>;
  subscribe: Mock<() => Mock>;
  destroy: Mock;
}

/**
 * Create a minimal mock store compatible with `PlayerContextValue`.
 *
 * Pass optional `state` to seed the store's state snapshot.
 */
export function createMockStore(state: Record<string, unknown> = {}): MockStore {
  return {
    state,
    attach: vi.fn(() => vi.fn()),
    subscribe: vi.fn(() => vi.fn()),
    destroy: vi.fn(),
  };
}

/**
 * Create a React wrapper that provides `PlayerContextProvider`.
 *
 * Accepts an optional store state seed. Returns the wrapper component,
 * the mock store, and the context value for assertions.
 */
export function createPlayerWrapper(storeState: Record<string, unknown> = {}): {
  store: MockStore;
  value: PlayerContextValue;
  Wrapper: ({ children }: { children: ReactNode }) => ReactNode;
} {
  const store = createMockStore(storeState);
  const value: PlayerContextValue = {
    store: store as any,
    media: null,
    setMedia: vi.fn(),
    container: null,
    setContainer: vi.fn(),
  };

  return {
    store,
    value,
    Wrapper({ children }: { children: ReactNode }) {
      return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
    },
  };
}
