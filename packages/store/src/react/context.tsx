import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { AnyStore } from '../core/store';

/**
 * Internal shared context for store instances.
 * All Providers write to this context.
 */
const StoreContext = createContext<AnyStore | null>(null);

/**
 * Internal hook for primitive UI components.
 * Accesses the nearest store from context without type information.
 *
 * @throws If used outside of a Provider
 */
export function useStoreContext(): AnyStore {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error('useStoreContext must be used within a Provider');
  }

  return store;
}

/**
 * Internal provider component that wraps children with store context.
 */
export function StoreContextProvider({ store, children }: { store: AnyStore; children: ReactNode }): ReactNode {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
