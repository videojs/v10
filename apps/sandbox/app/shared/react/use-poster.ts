import { useMemo } from 'react';
import { getPosterSrc } from '../sources';
import { useSource } from './use-source';

export function usePoster() {
  const source = useSource();
  return useMemo(() => getPosterSrc(source), [source]);
}
