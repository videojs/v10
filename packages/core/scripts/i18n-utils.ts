import { flatten } from '@videojs/utils/object';

export function flattenEntries(value: Record<string, unknown>): [string, string][] {
  return Object.entries(flatten(value)) as [string, string][];
}
