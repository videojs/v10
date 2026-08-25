export type SkinRuntimePrimitive = boolean | number | string | null | undefined;
export interface SkinRuntimeObject {
  readonly [key: string]: SkinRuntimeValue;
}
export type SkinRuntimeFunction = (...args: never[]) => SkinRuntimeValue;

/** Values a compiled skin module may expose to its generated template. */
export type SkinRuntimeValue =
  | SkinRuntimePrimitive
  | SkinRuntimeObject
  | readonly SkinRuntimeValue[]
  | SkinRuntimeFunction;
