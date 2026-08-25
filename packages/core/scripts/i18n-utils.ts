import { flatten } from '@videojs/utils/object';

import type { Translations } from '../src/core/i18n/params';

export function flattenEntries(value: Translations): [string, string][] {
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ Object.entries(
    flatten(value)
  ) as [string, string][];
}
