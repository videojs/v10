import { realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/** Matches script module ids, with or without a transform query, for plugin transform filters. */
export const SCRIPT_MODULE_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export interface TransformModule {
  readonly id: string;
  readonly filename: string;
  readonly params: URLSearchParams;
}

/** Split a host module ID into its physical filename and query parameters. */
export function parseModuleId(id: string): TransformModule {
  const queryIndex = id.indexOf('?');

  return queryIndex === -1
    ? { id, filename: id, params: new URLSearchParams() }
    : { id, filename: id.slice(0, queryIndex), params: new URLSearchParams(id.slice(queryIndex + 1)) };
}

/** Return the physical filename portion of a host module ID. */
export function moduleFilename(id: string): string {
  return parseModuleId(id).filename;
}

/** Build a stable host module ID from a filename and query parameters. */
export function moduleId(filename: string, parameters?: URLSearchParams | Readonly<Record<string, string>>): string {
  if (!parameters) return filename;

  const entries = parameters instanceof URLSearchParams ? [...parameters.entries()] : Object.entries(parameters);
  if (entries.length === 0) return filename;

  const query = new URLSearchParams(entries.sort(([left], [right]) => left.localeCompare(right)));

  return `${filename}?${query}`;
}

/** Normalize query ordering while preserving the module filename. */
export function normalizeModuleId(id: string): string {
  const parsed = parseModuleId(id);
  const filename = isAbsolute(parsed.filename) ? resolveModuleFilename(parsed.filename) : parsed.filename;

  return moduleId(filename, parsed.params);
}

/** Normalize a resolved filesystem module ID while leaving package and virtual IDs untouched. */
export function normalizeResolvedId(id: string): string {
  return isAbsolute(moduleFilename(id)) ? normalizeModuleId(id) : id;
}

export function isScriptModule(id: string): boolean {
  return /\.(?:[cm]?[jt]s|[jt]sx)$/.test(moduleFilename(id));
}

function resolveModuleFilename(filename: string): string {
  try {
    return realpathSync(resolve(filename));
  } catch {
    return resolve(filename);
  }
}

/** The Rolldown module type for a script filename. */
export function scriptModuleType(filename: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const name = moduleFilename(filename);
  if (name.endsWith('.tsx')) return 'tsx';

  if (name.endsWith('.jsx')) return 'jsx';

  if (/\.[cm]?ts$/.test(name)) return 'ts';

  return 'js';
}
