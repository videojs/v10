import { realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export interface ParsedModuleId {
  readonly filename: string;
  readonly parameters: URLSearchParams;
}

/** Split a host module ID into its physical filename and query parameters. */
export function parseModuleId(id: string): ParsedModuleId {
  const queryIndex = id.indexOf('?');

  return queryIndex === -1
    ? { filename: id, parameters: new URLSearchParams() }
    : { filename: id.slice(0, queryIndex), parameters: new URLSearchParams(id.slice(queryIndex + 1)) };
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

  return moduleId(filename, parsed.parameters);
}

/** Normalize a resolved filesystem module ID while leaving package and virtual IDs untouched. */
export function normalizeResolvedId(id: string): string {
  return isAbsolute(moduleFilename(id)) ? normalizeModuleId(id) : id;
}

export function isVjscModule(id: string): boolean {
  return /\.(?:[cm]?[jt]s|[jt]sx)$/.test(moduleFilename(id));
}

function resolveModuleFilename(filename: string): string {
  try {
    return realpathSync(resolve(filename));
  } catch {
    return resolve(filename);
  }
}
