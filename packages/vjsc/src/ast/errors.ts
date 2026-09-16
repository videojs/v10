/** An error anchored to a source offset, which the Vite adapter reports at the authored location. */
export interface SourceError extends Error {
  readonly pos: number;
}

/** Create an error that points at a source offset in the module being transformed. */
export function sourceError(message: string, pos: number): SourceError {
  return Object.assign(new Error(message), { pos });
}
