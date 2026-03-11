import type { SourceId } from '@app/shared/sources';
import { sourceStore } from './stores';
import { useExternalStore } from './use-external-store';

export function useSourceSwitcher(): [SourceId, (value: SourceId) => void] {
  const value = useExternalStore(sourceStore);
  return [value, sourceStore.setValue];
}
