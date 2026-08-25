import { isString } from '@videojs/utils/predicate';

import type { Text } from './text';

export function resolveText(text: Text | string): string {
  return isString(text) ? text : text.text;
}
