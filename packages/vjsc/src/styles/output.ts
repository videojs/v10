export interface StyleOutputRule {
  className: string;
  candidates: readonly string[];
  scopeRoot: boolean;
}

export interface StyleOutputFile {
  name: string;
  layer: string;
  rules: readonly StyleOutputRule[];
  groupOwners: ReadonlyMap<string, string>;
}
