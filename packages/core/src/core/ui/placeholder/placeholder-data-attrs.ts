import type { StateAttrMap } from '../types';
import type { PlaceholderState } from './placeholder-core';

export const PlaceholderDataAttrs = {
  visible: 'data-visible',
} as const satisfies StateAttrMap<PlaceholderState>;
