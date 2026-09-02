import { logMissingFeature } from '@videojs/core/dom';
import { useEffect } from 'react';

function useLogMissingFeatureDev(missing: boolean, displayName: string, featureName: string): void {
  useEffect(() => {
    if (missing) logMissingFeature(displayName, featureName);
  }, [missing, displayName, featureName]);
}

function useLogMissingFeatureProd(_missing: boolean, _displayName: string, _featureName: string): void {}

/**
 * Warn once that a component rendered without the media feature it needs.
 *
 * Logging from render would also fire for speculative and server renders, so the warning waits for a commit. Production
 * builds resolve to a no-op that registers no effect.
 */
export const useLogMissingFeature: (missing: boolean, displayName: string, featureName: string) => void = __DEV__
  ? useLogMissingFeatureDev
  : useLogMissingFeatureProd;
