import { getInitialSkin, onSkinChange } from '@app/shared/sandbox-listener';
import type { Skin } from '@app/types';
import { useEffect, useState } from 'react';

export function useSkin(): Skin {
  const [skin, setSkin] = useState(getInitialSkin);
  useEffect(() => onSkinChange(setSkin), []);
  return skin;
}
