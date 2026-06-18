import { useMemo } from 'react';
import { getPlaceholderSrc } from '../sources';
import { useSource } from './use-source';

export function usePlaceholder() {
  const source = useSource();
  return useMemo(() => getPlaceholderSrc(source), [source]);
}
