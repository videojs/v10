import { useEffect } from 'react';

import { currentStyle as styleStore } from '@/stores/preferences';
import { getDefaultStyle, type SupportedFramework } from '@/types/docs';
import { getStylePreferenceClient } from '@/utils/docs/preferences';

interface PreferenceUpdaterProps {
  currentFramework: SupportedFramework;
}

/**
 * PreferenceUpdater updates the style store from localStorage after a docs page loads. Framework state is synchronized
 * before document swaps by the docs navigation controller so route consumers never render the previous framework.
 */
export function PreferenceUpdater({ currentFramework }: PreferenceUpdaterProps) {
  useEffect(() => {
    // Read style from localStorage (StyleInit guarantees a valid value exists)
    // Fallback to default if React hydrates before StyleInit completes
    const style = getStylePreferenceClient(currentFramework) ?? getDefaultStyle(currentFramework);

    styleStore.set(style);
  }, [currentFramework]);

  // Astro SSR logs false "Invalid hook call" when a React component with hooks returns null. See withastro/astro#12283.
  // oxlint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
}
