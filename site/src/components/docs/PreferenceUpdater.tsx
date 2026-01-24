import { useEffect } from 'react';
import { currentFramework as frameworkStore, currentStyle as styleStore } from '@/stores/preferences';
import type { SupportedFramework, SupportedStyle } from '@/types/docs';

interface PreferenceUpdaterProps<F extends SupportedFramework = SupportedFramework> {
  currentFramework: F;
  currentStyle: SupportedStyle<F>;
}

/**
 * PreferenceUpdater component updates the preference nanostore based on URL params.
 * This component is loaded with client:idle directive on docs pages, making it non-blocking.
 * It updates the nanostore whenever framework or style from URL changes.
 * PreferenceSync handles persisting to cookies.
 */
export function PreferenceUpdater<F extends SupportedFramework = SupportedFramework>({
  currentFramework,
  currentStyle,
}: PreferenceUpdaterProps<F>) {
  useEffect(() => {
    frameworkStore.set(currentFramework);
    styleStore.set(currentStyle);
  }, [currentFramework, currentStyle]);

  return null;
}
