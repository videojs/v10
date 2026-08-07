import type { StateAttrMap } from '../types';
import type { TitleState } from './title-core';

export const TitleDataAttrs = {
  /** Present when a title is available to display. */
  hasTitle: 'data-has-title',
  /** Present when the title should be displayed. */
  visible: 'data-visible',
} as const satisfies StateAttrMap<TitleState>;
