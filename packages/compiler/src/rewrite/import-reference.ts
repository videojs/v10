export interface ImportReference {
  readonly source: string;
  readonly name: string;
  readonly default?: boolean | undefined;
  readonly type?: boolean | undefined;
}

export interface ImportOptions {
  default?: boolean | undefined;
  type?: boolean | undefined;
}

export interface MutableImportReference extends ImportReference {
  used: boolean;
}

const importReference = Symbol('vjsc/import-ref');

export function createImportReference(source: string, name: string, options: ImportOptions): MutableImportReference {
  return {
    [importReference]: true,
    source,
    name,
    default: options.default,
    type: options.type,
    used: false,
  } as MutableImportReference;
}

export function isImportReference(value: unknown): value is MutableImportReference {
  return isObject(value) && importReference in value;
}

import { isObject } from '@videojs/utils/predicate';
