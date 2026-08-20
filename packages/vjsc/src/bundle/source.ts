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

export interface VjscBuildOutput {
  readonly files: readonly VjscOutputFile[];
  readonly watchFiles: readonly string[];
}

/** Build-only asset projection activated by using its virtual module as an entry. */
export interface VjscOutputAdapter {
  readonly moduleId: `virtual:vjsc/${string}`;
  build(): VjscBuildOutput | Promise<VjscBuildOutput>;
}

export function defineVjscOutput<const Output extends VjscOutputAdapter>(output: Output): Output {
  return output;
}
