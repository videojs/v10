import { useEffect, useState } from 'react';
import { getInitialSource, onSourceChange } from '../sandbox-listener';
import type { SourceId } from '../sources';

export function useSource(audioOnly?: boolean): SourceId {
  const [source, setSource] = useState(() => getInitialSource(audioOnly));
  useEffect(() => onSourceChange(setSource), []);
  return source;
}
