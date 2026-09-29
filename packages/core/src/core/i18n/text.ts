import { isObject } from '@videojs/utils/predicate';

export interface Text {
  readonly key: string;
  readonly text: string;
}

/** @internal */
export function isText(value: unknown): value is Text {
  return isObject(value) && 'key' in value && 'text' in value;
}

/** @internal */
export type TextParams = Record<string, string | number>;
