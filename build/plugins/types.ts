/**
 * Minimal rolldown plugin interface covering only the hooks used by our build
 * plugins. The full `Plugin` type lives in `rolldown` which is a transitive
 * dependency (via tsdown) and not directly resolvable from the repo root.
 */
export interface BuildPlugin {
  name: string;
  transform?: (this: void, code: string, id: string) => { code: string } | null;
  resolveId?: (
    this: void,
    source: string,
    importer: string | undefined
  ) => { id: string; moduleSideEffects: boolean } | null;
  load?: (this: void, id: string) => { code: string; moduleSideEffects: boolean } | null;
  buildStart?: (this: { addWatchFile: (file: string) => void }) => void;
  writeBundle?: (this: void) => void;
}
