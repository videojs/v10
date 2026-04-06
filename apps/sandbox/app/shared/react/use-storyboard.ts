import { useMemo } from 'react';
import { getStoryboardSrc } from '../sources';
import { useSource } from './use-source';

export function useStoryboard() {
  const source = useSource();
  return useMemo(() => getStoryboardSrc(source), [source]);
}
