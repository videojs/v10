import { getInitialSource, onSourceChange } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { useEffect, useState } from 'react';

export function useSource(): SourceId {
  const [source, setSource] = useState(getInitialSource);

  useEffect(() => onSourceChange(setSource), []);
  return source;
}
