import { useEffect } from 'react';
import { currentFramework as frameworkStore, currentStyle as styleStore } from '@/stores/preferences';
import { getDefaultStyle, type SupportedFramework } from '@/types/docs';
import { getStylePreferenceClient } from '@/utils/docs/preferences';

interface PreferenceUpdaterProps {
  currentFramework: SupportedFramework;
}

/**
 * PreferenceUpdater component updates the preference nanostore based on URL params and localStorage.
 * This component is loaded with client:idle directive on docs pages, making it non-blocking.
 * It updates the framework store from URL params and style store from localStorage.
 * PreferenceSync handles persisting framework to cookies.
 */
export function PreferenceUpdater({ currentFramework }: PreferenceUpdaterProps) {
  useEffect(() => {
    // Update framework store from URL
    frameworkStore.set(currentFramework);

    // Read style from localStorage (StyleInit guarantees a valid value exists)
    // Fallback to default if React hydrates before StyleInit completes
    const style = getStylePreferenceClient(currentFramework) ?? getDefaultStyle(currentFramework);
    styleStore.set(style);
  }, [currentFramework]);

  // biome-ignore lint/complexity/noUselessFragments: Astro SSR logs false "Invalid hook call" when a React component with hooks returns null. See withastro/astro#12283.
  return <></>;
}
