import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import { defineFeature } from '../../core/feature';
import { createStore as createCoreStore } from '../../core/store';
import { StoreContextProvider, useStoreContext } from '../context';

describe('context', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
  }

  const audioFeature = defineFeature<MockMedia>()({
    state: () => ({
      volume: 1,
    }),
    getSnapshot: ({ target }) => ({ volume: target.volume }),
    subscribe: () => {},
  });

  describe('useStoreContext', () => {
    it('throws when used outside of Provider', () => {
      expect(() => {
        renderHook(() => useStoreContext());
      }).toThrow('useStoreContext must be used within a Provider');
    });

    it('returns store from context', () => {
      const store = createCoreStore({ features: [audioFeature] });

      const { result } = renderHook(() => useStoreContext(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <StoreContextProvider store={store}>{children}</StoreContextProvider>
        ),
      });

      expect(result.current).toBe(store);
    });
  });
});
