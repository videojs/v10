import { getInitialMuted, onMutedChange } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function useMuted(): boolean {
  const [muted, setMuted] = useState(getInitialMuted);
  useEffect(() => onMutedChange(setMuted), []);
  return muted;
}
