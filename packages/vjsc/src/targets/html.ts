import { basename } from 'node:path';
import { runInNewContext } from 'node:vm';

export { HTML_RUNTIME, HTML_RUNTIME_ID, HTML_RUNTIME_IMPORT } from './html/virtual';

/** Evaluate a bundled entry against the static JSX runtime and return its HTML. */
export function renderHtmlChunk(code: string, entryFile: string, imports: readonly string[] = []): string {
  const module = { exports: {} as Record<string, unknown> };
  const external = new Set(imports);

  runInNewContext(code, {
    module,
    exports: module.exports,
    require(specifier: string) {
      if (!external.has(specifier)) throw new Error(`Unexpected external module in HTML build: ${specifier}`);
      return {};
    },
  });

  return String(selectRender(module.exports, entryFile)({})).trim();
}

function selectRender(
  exports: Readonly<Record<string, unknown>>,
  entryFile: string
): (props: Record<string, never>) => unknown {
  if (typeof exports.default === 'function') return exports.default as (props: Record<string, never>) => unknown;

  const conventionalName = basename(entryFile)
    .replace(/(?:\.skin)?\.[^.]+$/, '')
    .replace(/(^|-)(\w)/g, (_, _dash, letter: string) => letter.toUpperCase());
  const conventional = Object.entries(exports).filter(
    ([name, value]) => typeof value === 'function' && (name === conventionalName || name.endsWith(conventionalName))
  );
  if (conventional.length === 1) return conventional[0]![1] as (props: Record<string, never>) => unknown;

  const functions = Object.entries(exports).filter(
    (item): item is [string, (props: Record<string, never>) => unknown] => typeof item[1] === 'function'
  );
  if (functions.length === 1) return functions[0]![1];

  const available = functions.map(([name]) => name).join(', ') || '(none)';
  throw new Error(
    `HTML build could not select the entry component in \`${entryFile}\`. ` +
      `Use a default export or leave exactly one function export. Function exports: ${available}.`
  );
}
