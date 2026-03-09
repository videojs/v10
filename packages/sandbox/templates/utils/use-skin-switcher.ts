import type { Skin } from '../types';
import { useWebStorage } from './use-web-storage';

export function useSkinSwitcher() {
  return useWebStorage<Skin>('local', 'skin', 'default');
}
