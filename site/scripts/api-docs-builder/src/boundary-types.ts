export type ApiDocPrimitive = boolean | number | string | null;
export interface ApiDocObject {
  readonly [key: string]: ApiDocInput;
}

/** JSON-compatible data entering API-doc generation from package metadata or extractor output. */
export type ApiDocInput = ApiDocPrimitive | ApiDocObject | readonly ApiDocInput[];
