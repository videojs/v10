import { isObject } from '@videojs/utils/predicate';

export interface Text {
  readonly key: string;
  readonly text: string;
}

export function isText<Value>(value: Value): value is Value & Text {
  return isObject(value) && 'key' in value && 'text' in value;
}

export type TextParams = Record<string, string | number>;
