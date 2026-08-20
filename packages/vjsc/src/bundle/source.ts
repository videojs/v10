/** In-memory source module and the files that determine it. */
export interface VjscModule {
  readonly code: string;
  readonly watchFiles: readonly string[];
}

/** Source file produced by a VJSC build output adapter. */
export interface VjscOutputFile {
  readonly path: string;
  readonly content: string;
}

export type VjscOutputFormatter = (file: VjscOutputFile) => string | Promise<string>;
