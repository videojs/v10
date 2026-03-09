import type { SourceId } from '../shared/sources';
import { useWebStorage } from './use-web-storage';

export function useSourceSwitcher() {
  return useWebStorage<SourceId>('local', 'source', 'hls-1');
}
