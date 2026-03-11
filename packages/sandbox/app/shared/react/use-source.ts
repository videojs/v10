import { getInitialSource, onSourceChange } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { useEffect, useState } from 'react';

export function useSource(audioOnly?: boolean): SourceId {
  const [source, setSource] = useState(() => getInitialSource(audioOnly));
  useEffect(() => onSourceChange(setSource), []);
  return source;
}
