import { getInitialPreload, onPreloadChange, type PreloadValue } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function usePreload(): PreloadValue {
  const [preload, setPreload] = useState(getInitialPreload);
  useEffect(() => onPreloadChange(setPreload), []);
  return preload;
}
