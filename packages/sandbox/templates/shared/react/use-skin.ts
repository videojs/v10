import { useEffect, useState } from 'react';
import type { Skin } from '../../types';
import { getInitialSkin, onSkinChange } from '../sandbox-listener';

export function useSkin(): Skin {
  const [skin, setSkin] = useState(getInitialSkin);
  useEffect(() => onSkinChange(setSkin), []);
  return skin;
}
