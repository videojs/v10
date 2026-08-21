export interface VjscModuleMeta {
  readonly source?: string | undefined;
  readonly component?: Readonly<Record<string, unknown>> | undefined;
  readonly [key: string]: unknown;
}

export function mergeVjscMeta(
  meta: unknown,
  update: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  const current = isRecord(meta) ? meta : {};

  return {
    ...current,
    vjsc: {
      ...readVjscMeta(current),
      ...update,
    },
  };
}

export function readVjscSource(meta: unknown): string | undefined {
  const source = readVjscMeta(meta)?.source;

  return typeof source === 'string' ? source : undefined;
}

export function readVjscMeta(meta: unknown): VjscModuleMeta | undefined {
  if (!isRecord(meta) || !isRecord(meta.vjsc)) return undefined;

  return meta.vjsc;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
