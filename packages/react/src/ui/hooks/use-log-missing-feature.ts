import { logMissingFeature } from '@videojs/core/dom';
import { useEffect } from 'react';

function useLogMissingFeatureDev(missing: boolean, displayName: string, featureName: string): void {
  useEffect(() => {
    if (missing) logMissingFeature(displayName, featureName);
  }, [missing, displayName, featureName]);
}

function useLogMissingFeatureProd(_missing: boolean, _displayName: string, _featureName: string): void {}

/** Logs optional-feature diagnostics after commit in development builds only. */
export const useLogMissingFeature = __DEV__ ? useLogMissingFeatureDev : useLogMissingFeatureProd;
