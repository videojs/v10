import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { currentFramework } from '@/stores/preferences';
import { getFrameworkPreferenceClient, setFrameworkPreferenceClient } from '@/utils/docs/preferences';

/**
 * PreferenceSync keeps the framework nanostore in sync with cookies.
 *
 * On mount: Reads cookies → initializes store
 * On store change: Writes to cookies
 *
 * Style preferences are handled via localStorage by StyleInit and PreferenceUpdater.
 *
 * This component should be loaded with client:idle in the base layout
 * to ensure preferences are available immediately.
 */
export function PreferenceSync() {
  const framework = useStore(currentFramework);

  // Initialize store from cookies on mount
  useEffect(() => {
    currentFramework.set(getFrameworkPreferenceClient());
  }, []);

  // Sync store changes to cookies
  useEffect(() => {
    if (framework) {
      setFrameworkPreferenceClient(framework);
    }
  }, [framework]);

  // Workaround: Astro SSR logs false "Invalid hook call" when a React
  // component with hooks returns null. See withastro/astro#12283.
  return <></>;
}
