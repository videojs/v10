import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import { currentFramework } from '@/stores/preferences';
import { getFrameworkPreferenceClient, setFrameworkPreferenceClient } from '@/utils/docs/preferences';

/**
 * PreferenceSync keeps the framework nanostore in sync with cookies.
 *
 * On mount: Reads cookies only when the store is uninitialized. On store change: Writes to cookies.
 *
 * Style preferences are handled via localStorage by StyleInit and PreferenceUpdater.
 *
 * This component is loaded with client:idle in the base layout. Docs routes seed the framework before it hydrates.
 */
export function PreferenceSync() {
  const framework = useStore(currentFramework);

  // Initialize store from cookies on mount
  useEffect(() => {
    if (currentFramework.get() === null) {
      currentFramework.set(getFrameworkPreferenceClient());
    }
  }, []);

  // Sync store changes to cookies
  useEffect(() => {
    if (framework) {
      setFrameworkPreferenceClient(framework);
    }
  }, [framework]);

  // Astro SSR logs false "Invalid hook call" when a React component with hooks returns null. See withastro/astro#12283.
  // oxlint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
}
