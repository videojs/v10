import { getInitialSource, onSourceChange } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { useEffect, useState } from 'react';

export function useSource(audioOnly?: boolean, vimeoOnly?: boolean, youtubeOnly?: boolean): SourceId {
  const [source, setSource] = useState(() => getInitialSource(audioOnly, vimeoOnly, youtubeOnly));
  useEffect(() => onSourceChange(setSource), []);
  return source;
}
