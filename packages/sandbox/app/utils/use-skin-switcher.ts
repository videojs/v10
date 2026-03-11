import type { Skin } from '@app/types';
import { skinStore } from './stores';
import { useExternalStore } from './use-external-store';

export function useSkinSwitcher(): [Skin, (value: Skin) => void] {
  const value = useExternalStore(skinStore);
  return [value, skinStore.setValue];
}
