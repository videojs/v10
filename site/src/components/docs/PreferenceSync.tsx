import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { currentFramework, currentStyle } from '@/stores/preferences';
import type { SupportedFramework, SupportedStyle } from '@/types/docs';
import { getPreferenceClient, setPreferenceClient } from '@/utils/docs/preferences';

/**
 * PreferenceSync keeps the nanostore in sync with cookies.
 *
 * On mount: Reads cookies → initializes store
 * On store change: Writes to cookies
 *
 * This component should be loaded with client:load in the base layout
 * to ensure preferences are available immediately.
 */
export function PreferenceSync() {
  const framework = useStore(currentFramework);
  const style = useStore(currentStyle);

  // Initialize store from cookies on mount
  useEffect(() => {
    const prefs = getPreferenceClient();
    if (prefs.framework) {
      currentFramework.set(prefs.framework);
    }
    if (prefs.style) {
      currentStyle.set(prefs.style);
    }
  }, []);

  // Sync store changes to cookies
  useEffect(() => {
    if (framework && style) {
      setPreferenceClient(framework as SupportedFramework, style as SupportedStyle<typeof framework>);
    }
  }, [framework, style]);

  return null;
}
