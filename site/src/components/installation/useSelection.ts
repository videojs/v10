import { useSyncExternalStore } from 'react';

import { selectionAtoms } from '@/stores/installation';
import { DEFAULT_SELECTION, type InstallationUiSelection } from '@/utils/installation/url-state';

/**
 * Read one installation pick. Islands hydrate against markup rendered with the defaults, while the store may already
 * hold the URL's picks or a choice made before this island hydrated. Handing React the default as the server snapshot
 * lets hydration match, then the real value arrives as an ordinary update instead of a hydration mismatch.
 */
export function useSelection<K extends keyof InstallationUiSelection>(
  key: K,
  serverValue: InstallationUiSelection[K] = DEFAULT_SELECTION[key]
): InstallationUiSelection[K] {
  const store = selectionAtoms[key];

  return useSyncExternalStore(
    (onChange) => store.listen(onChange),
    () => store.get(),
    () => serverValue
  );
}
