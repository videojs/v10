import { getInitialLoop, onLoopChange } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function useLoop(): boolean {
  const [loop, setLoop] = useState(getInitialLoop);
  useEffect(() => onLoopChange(setLoop), []);
  return loop;
}
