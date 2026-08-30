export interface ModuleMeta {
  readonly [key: string]: unknown;
}

/** Static metadata associated with a named component module. */
export interface ComponentMeta extends ModuleMeta {
  readonly name: string;
}
