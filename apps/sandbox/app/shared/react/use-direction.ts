import { getDirection, onDirectionChange, type TextDirection } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

/** The shell's pinned text direction, or `auto` to let the player follow its locale. */
export function useDirection(): TextDirection {
  const [direction, setDirection] = useState(getDirection);

  useEffect(() => onDirectionChange(setDirection), []);

  return direction;
}
