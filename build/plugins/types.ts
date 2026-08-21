export interface BuildMagicString {
  overwrite(start: number, end: number, content: string): unknown;
  toString(): string;
}

interface BuildTransformMeta {
  readonly magicString?: BuildMagicString | undefined;
}

interface BuildRenderChunkMeta {
  readonly magicString?: BuildMagicString | undefined;
}

interface BuildCodeResult {
  code: string | BuildMagicString;
  map?: object | undefined;
}

/** Minimal Rolldown plugin interface covering the hooks used by root build plugins. */
export interface BuildPlugin {
  name: string;
  transform?: (this: void, code: string, id: string, meta?: BuildTransformMeta) => BuildCodeResult | null;
  resolveId?: (
    this: void,
    source: string,
    importer: string | undefined
  ) => { id: string; external?: boolean; moduleSideEffects?: boolean } | null;
  load?: (this: void, id: string) => { code: string; moduleSideEffects: boolean } | null;
  buildStart?: (this: { addWatchFile: (file: string) => void }) => void;
  renderChunk?: (
    this: void,
    code: string,
    chunk: { fileName: string },
    outputOptions?: unknown,
    meta?: BuildRenderChunkMeta
  ) => BuildCodeResult | null;
  writeBundle?: (this: void) => void;
  closeWatcher?: (this: void) => void;
}
