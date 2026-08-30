export interface ModuleMeta {
  readonly [key: string]: unknown;
}

export interface NamedModuleMeta extends ModuleMeta {
  readonly name: string;
}
