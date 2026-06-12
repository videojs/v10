import { getInitialAutoplay, onAutoplayChange } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function useAutoplay(): boolean {
  const [autoplay, setAutoplay] = useState(getInitialAutoplay);
  useEffect(() => onAutoplayChange(setAutoplay), []);
  return autoplay;
}
