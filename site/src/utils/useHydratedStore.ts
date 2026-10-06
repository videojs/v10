import type { ReadableAtom } from 'nanostores';
import { useSyncExternalStore } from 'react';

/**
 * Read a store that the client fills before islands hydrate, such as from the URL or saved preferences. Islands hydrate
 * against markup rendered with `serverValue`, so handing React that value as the server snapshot lets hydration match,
 * then the store's value arrives as an ordinary update instead of a hydration mismatch.
 */
export function useHydratedStore<Value>(store: ReadableAtom<Value>, serverValue: Value): Value {
  return useSyncExternalStore(
    (onChange) => store.listen(onChange),
    () => store.get(),
    () => serverValue
  );
}
