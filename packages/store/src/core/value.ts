export type StorePrimitive = boolean | bigint | number | string | symbol | null | undefined;

/** Values a slice may own in source or derived state. */
export type StoreValue = StorePrimitive | object;
